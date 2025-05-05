import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }
  }, []);

  const extractCode = (url) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const code = extractCode(inputValue.trim());

    try {
      console.log("🔍 Fetching product from API with code:", code);
      const response = await axios.get(`http://localhost:8386/api/fetch-product?code=${code}`);
      const { data } = response.data;

      const newProduct = {
        QRCode: inputValue.trim(),
        Product_Name: data.product_name || 'Unknown',
        Lot: data.lot || 'N/A',
        Expired_Date: data.expired_date || 'N/A',
        Unit: data.unit_name || (data.retail_unit_detail ? data.retail_unit_detail.unit : "N/A"),
        Uniq: code,
        Status: 'Printing...'
      };

      const updatedProducts = [...products, newProduct];
      setProducts(updatedProducts);
      setInputValue('');

      console.log('📦 Sending to printer:', newProduct);

      try {
        const printRes = await axios.post('http://localhost:9999/print/', {
          QRCode: newProduct.QRCode,
          Product_Name: newProduct.Product_Name,
          Lot: newProduct.Lot,
          Expired_Date: newProduct.Expired_Date,
          Unit: newProduct.Unit,
          Uniq: newProduct.Uniq
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Print response:', printRes.status, printRes.data);

        if (printRes.status === 200 && printRes.data.status === 'printed') {
          updatedProducts[updatedProducts.length - 1].Status = 'Done';
        } else {
          updatedProducts[updatedProducts.length - 1].Status = `Failed: ${printRes.data.status || 'Unknown'}`;
        }
      } catch (printErr) {
        console.error('❌ Print error:', printErr);
        const errorMessage = printErr.response?.data?.error || printErr.message || 'Unknown error';
        updatedProducts[updatedProducts.length - 1].Status = `Failed: ${errorMessage}`;
      }

      setProducts([...updatedProducts]);
      localStorage.setItem('products', JSON.stringify(updatedProducts));

    } catch (error) {
      console.error('❌ Fetch error:', error);
    }
  };

  const handleClear = () => {
    setProducts([]);
    localStorage.removeItem('products');
  };

  const handleExport = () => {
    if (products.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(products.map((p) => ({
      QRCode: p.QRCode,
      Product_Name: p.Product_Name,
      Lot: p.Lot,
      Expired_Date: p.Expired_Date,
      Unit: p.Unit,
      Uniq: p.Uniq,
      Status: p.Status
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(file, `products_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔎 URL Product Search + <b>Print</b></h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Scan or enter product URL"
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Search & Print</button>
      </form>

      <div style={styles.buttonGroup}>
        <button onClick={handleClear} style={styles.clearButton}>Clear Table</button>
        <button onClick={handleExport} style={styles.exportButton}>Export to Excel</button>
      </div>

      {products.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>QRCode</th>
              <th style={styles.th}>Product Name</th>
              <th style={styles.th}>Lot</th>
              <th style={styles.th}>Expired Date</th>
              <th style={styles.th}>Unit</th>
              <th style={styles.th}>Uniq</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={index}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>{product.QRCode}</td>
                <td style={styles.td}>{product.Product_Name}</td>
                <td style={styles.td}>{product.Lot}</td>
                <td style={styles.td}>{product.Expired_Date}</td>
                <td style={styles.td}>{product.Unit}</td>
                <td style={styles.td}>{product.Uniq}</td>
                <td style={styles.td}>{product.Status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f2f6fc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '50px 20px',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '40px',
    color: '#333',
  },
  form: {
    display: 'flex',
    width: '100%',
    maxWidth: '600px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderTopLeftRadius: '8px',
    borderBottomLeftRadius: '8px',
    outline: 'none',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    borderTopRightRadius: '8px',
    borderBottomRightRadius: '8px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
  },
  clearButton: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  exportButton: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    maxWidth: '1100px',
    backgroundColor: '#fff',
    borderCollapse: 'collapse',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  th: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '12px',
    textAlign: 'left',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #ddd',
    wordBreak: 'break-word',
  }
};

export default App;

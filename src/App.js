import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [products, setProducts] = useState([]);

  // Load từ localStorage lúc khởi tạo
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
      const response = await axios.get(`http://localhost:8386/api/fetch-product?code=${code}`);
      const { data } = response.data;

      const productInfo = {
        qrcode: inputValue.trim(),
        product_name: data.product_name,
        lot: data.lot,
        expired_date: data.expired_date,
        unit_name: data.unit_name || (data.retail_unit_detail ? data.retail_unit_detail.unit : "N/A"),
        uniq: code,
      };

      const updatedProducts = [...products, productInfo];

      setProducts(updatedProducts);                     // Cập nhật State
      localStorage.setItem('products', JSON.stringify(updatedProducts));  // Cập nhật luôn LocalStorage

      setInputValue('');
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const handleClear = () => {
    setProducts([]);
    localStorage.removeItem('products');
  };

  const handleExport = () => {
    if (products.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(products.map((product) => ({
      QRCode: product.qrcode,
      Product_Name: product.product_name,
      Lot: product.lot,
      Expired_Date: product.expired_date,
      Unit: product.unit_name,
      Uniq: product.uniq,
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(file, `products_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔎 URL Product Search</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Scan or enter product URL here..."
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Search</button>
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
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={index}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>{product.qrcode}</td>
                <td style={styles.td}>{product.product_name}</td>
                <td style={styles.td}>{product.lot}</td>
                <td style={styles.td}>{product.expired_date}</td>
                <td style={styles.td}>{product.unit_name}</td>
                <td style={styles.td}>{product.uniq}</td>
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
    maxWidth: '1000px',
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

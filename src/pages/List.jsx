import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function List() {
    const [reports, setReports] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://localhost:5000/api/reports')
            .then(res => res.json())
            .then(data => setReports(data))
            .catch(err => console.error('Failed to fetch reports:', err));
    }, []);

    return (
        <div className="list-page" style={{ padding: '60px 0' }}>
            <div className="container" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: 'var(--primary-color)', marginBottom: '30px', fontSize: '2rem' }}>민원 목록</h2>

                {/* Search Bar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '30px', alignItems: 'center' }}>
                    <select style={{ padding: '10px', border: '1px solid #E0E0E0', borderRadius: '4px' }}>
                        <option>제 목</option>
                        <option>지 역</option>
                        <option>번 호</option>
                        <option>신고일</option>
                    </select>
                    <input type="text" style={{ padding: '10px', border: '1px solid #E0E0E0', borderRadius: '4px', width: '300px' }} />
                    <button style={{ padding: '10px 25px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>검색</button>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                            <th style={{ padding: '15px', border: '1px solid #303F9F' }}>번호</th>
                            <th style={{ padding: '15px', border: '1px solid #303F9F' }}>제목</th>
                            <th style={{ padding: '15px', border: '1px solid #303F9F' }}>지역</th>
                            <th style={{ padding: '15px', border: '1px solid #303F9F' }}>신고일</th>
                            <th style={{ padding: '15px', border: '1px solid #303F9F' }}>관심</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report.id} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate(`/reports/${report.id}`)}>
                                <td style={{ padding: '12px', borderBottom: '1px solid #EEE' }}>{report.id}</td>
                                <td style={{ padding: '12px', borderBottom: '1px solid #EEE', textAlign: 'left' }}>{report.title}</td>
                                <td style={{ padding: '12px', borderBottom: '1px solid #EEE' }}>{report.region}</td>
                                <td style={{ padding: '12px', borderBottom: '1px solid #EEE' }}>{report.date}</td>
                                <td style={{ padding: '12px', borderBottom: '1px solid #EEE' }}>{report.interested}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination Placeholder */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                    <span style={{ cursor: 'pointer' }}>⏪</span>
                    <span style={{ cursor: 'pointer' }}>◀️</span>
                    <span style={{ cursor: 'pointer' }}>1</span>
                    <span style={{ cursor: 'pointer' }}>2</span>
                    <span style={{ cursor: 'pointer' }}>3</span>
                    <span>...</span>
                    <span style={{ cursor: 'pointer' }}>50</span>
                    <span style={{ cursor: 'pointer' }}>▶️</span>
                    <span style={{ cursor: 'pointer' }}>⏩</span>
                </div>
            </div>
        </div>
    );
}

export default List;

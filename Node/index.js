
require('dotenv').config(); // 반드시 최상단

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});         //dotenv 모듈을 사용해서 환경 변수 로드
const express = require('express');
const http = require('http');

const { GameServer } = require('./gameServer');
const authRouter = require('./authRouter');

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use('/api', authRouter);

// HTTP 서버 생성 (Express 앱을 기반으로)
const httpServer = http.createServer(app);

// GameServer(WebSocket) 인스턴스 생성
const gameServerInstance = new GameServer(httpServer);

//서버 시작 시 모든 유저 오프라인 초기화
(async () => {
    try {
        await pool.query('UPDATE users SET is_online = 0');
        await pool.query('DELETE FROM refresh_tokens'); 
        console.log("서버 시작 시 전체 is_online 및 refresh_tokens 초기화 완료");
    } catch (err) {
        console.error("초기화 실패:", err);
    }
})();

// 통합 서버 시작
httpServer.listen(PORT, () => {
    console.log('------------------------------------------------');
    console.log(`[Server] 통합 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`[HTTP] 인증 API 주소: http://localhost:${PORT}/api/login`);
    console.log(`[WS] WebSocket 연결 주소: ws://localhost:${PORT}`);
    console.log('------------------------------------------------');
});
//필요한 모듈 불러 오기
require('dotenv').config();         //dotenv 모듈을 사용해서 환경 변수 로드
const express = require('express');
const http = require('http');

const {GameServer} = require('./gameServer');
const authRouter = require('./authRouter');

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use('/api', authRouter);

// HTTP 서버 생성 (Express 앱을 기반으로)
// HTTP 서버는 Express 요청을 처리하는 동시에 WebSocket 서버의 기반이 됩니다.
const httpServer = http.createServer(app);

//GameSever(WebSocket) 인스턴스 생성 및 HTTP 서버 통합
const gameServerInstance = new GameServer(httpServer);

//통합 서버 시작
httpServer.listen(PORT, ()=>{
    console.log('------------------------------------------------');
    console.log(`[Server] 통합 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`[HTTP] 인증 API 주소: http://localhost:${PORT}/api/login`);
    console.log(`[WS] WebSocket 연결 주소: ws://localhost:${PORT}`);
    console.log('------------------------------------------------');
});
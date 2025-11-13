//필요한 모듈 불러 오기
require('dotenv').config();         //dotenv 모듈을 사용해서 환경 변수 로드

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

//Express 앱 생성 및 미들웨어 설정
const app = express();
app.use(bodyParser.json());

//사용자 데이터 및 리프래시 토큰 저장소 (실체는 데이터베이스에서 진행)
const users = [];
const refreshTokens = {};

//환경 변수에서 시크릿 키와 포트 가져오기
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const PORT = process.env.PORT || 3000;

app.post('/register', async(req, res) => {

    const {username, password} = req.body;
    console.log("작동해용ㅇ");

    if(users.find(user => user.username === username))
    {
        return res.status(400).json({error : '이미 존재하는 사용자 입니다.'});
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({username, password: hashedPassword});        //hash값으로 비밀번호

    res.status(201).json({message : '회원 가입 성공'});
})

//로그인 라우트
app.post('/login', async(req, res) => {
    const {username, password} = req.body;
    const user = users.find(user => user.username === username);

    if(!user || !(await bcrypt.compare(password, user.password)))
    {
        return res.status(400).json({error : '잘못된 사용자면 또는 비밀번호입니다.'});
    }

    const accessToken = generateAccessToken(username);
    console.log(accessToken);
    const refreschToken = jwt.sign({username}, REFRESH_TOKEN_SECRET);

    refreshTokens[refreschToken] = username;
    res.json({accessToken, refreschToken});
})

//액세스 토큰 생성 함수
function generateAccessToken(username)
{
    return jwt.sign({username}, JWT_SECRET, {expiresIn: '15m'});
}

//토큰 인증 미들웨어
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if(err) return res.sendStatus(403);
        next();
    })
}

app.get('/getNewToken', async(req, res) => {
    const{accessToken, refreschToken} = req.body;

    if(accessToken == null) return res.sendStatus(401);
    if(refreschToken == null) return res.sendStatus(401);

    jwt.verify(accessToken, JWT_SECRET, (err, user) =>{
        if(err)
        {
            if(err.name !== 'TokenExpiredError') return res.sendStatus(403);

            jwt.verify(refreschToken, REFRESH_TOKEN_SECRET, (err, user) => {
                if(err) return res.sendStatus(403);

                const username = refreshTokens[refreschToken];

                const accessToken = generateAccessToken(username);      //접근 토큰 생성
                console.log(accessToken);

                res.json({accessToken});   //점근 토큰 전달
            })
        }
    })
})

app.listen(PORT, ()=> console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`));

// console.log(JWT_SECRET);
// console.log(REFRESH_TOKEN_SECRET);
// console.log(PORT);
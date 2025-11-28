const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host : 'localhost',
    user : 'root',
    password : 'pe288212!',
    database : 'gametest'
});


//Express 앱 생성 및 미들웨어 설정
const router = express.Router();
router.use(bodyParser.json());

//사용자 데이터 및 리프래시 토큰 저장소 (실체는 데이터베이스에서 진행)
const users = [];
const refreshTokens = {};

//환경 변수에서 시크릿 키와 포트 가져오기
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

router.post('/register', async(req, res) => {

    const {username, password, nickname} = req.body;

    try
    {
        const [temp1] = await pool.query(
           'SELECT COUNT(*) AS count FROM users WHERE username = ?', [username]
        );
        const [temp2] = await pool.query(
           'SELECT COUNT(*) AS count FROM users WHERE nickname = ?', [nickname]
        );

        if(temp1[0].count == 1)
        {
            return res.status(400).json({error : '이미 사용중인 사용자이름입니다.'});
        }
        else if (temp2[0].count == 1)
        {
            return res.status(400).json({error : '이미 사용중인 닉네임입니다.'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(                                             //회원 정보 업데이트
            'INSERT INTO users (username, passward, nickname) VALUES (?, ?, ?)',
            [username, hashedPassword, nickname]
        );
    }
    catch(error)
    {
        res.status(500).json({success: false, message : error.message});
    }

    res.status(201).json({message : '회원 가입 성공'});
})

//로그인 라우트
router.post('/login', async(req, res) => {
    const {username, password} = req.body;
    
    try
    {
        const [user] = await pool.query(
           'SELECT user_id, passward, nickname FROM users WHERE username = ?',
           [username]
        );

        if(user.length <= 0 || !(await bcrypt.compare(password, user[0].passward)))
        {
            return res.status(400).json({error : '잘못된 사용자면 또는 비밀번호입니다.'});
        }

        const [temp] = await pool.query(
            'SELECT COUNT(*) AS count FROM refresh_tokens WHERE user_id = ?',
            [user[0].user_id]
        );
        if(temp[0].count == 1)
        {
            return res.status(400).json({error : '이미 로그인이된 계정입니다.'});
        }

        user_id = user[0].user_id;    
        await pool.query(
            'UPDATE users SET logined_at = NOW() WHERE user_id = ?',
            [user_id]
        );

        const accessToken = generateAccessToken(username);
        //console.log(accessToken);
        const refreshToken = jwt.sign({username}, REFRESH_TOKEN_SECRET);

        await pool.query(
            'UPDATE users SET logined_at = NOW() WHERE user_id = ?',
            [user_id]
        );
        
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, refresh_token) VALUES (?, ?)',
            [user_id, refreshToken]
        ); 

        res.json({user_id, accessToken, refreshToken});
    }
    catch(error)
    {
        res.status(500).json({success: false, message : error.message});
    }
});

//로그인 라우트
router.post('/logout', async(req, res) => {
    const {user_id} = req.body;

    try
    {       
        await pool.query(
            'UPDATE users SET logouted_at = NOW() WHERE user_id = ?',
            [user_id]
        );
        
        await pool.query(
            'DELETE FROM refresh_tokens WHERE user_id = ?',
            [user_id]
        );

        res.status(201).json({message : '로그아웃 되었습니다.'});
    }
    catch(error)
    {
        res.status(500).json({success: false, message : error.message});
    }
});

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

router.get('/token', async(req, res) => {
    const{accessToken, refreshToken} = req.body;

    if(!accessToken) return res.sendStatus(401);
    if(!refreshToken) return res.sendStatus(401);

    jwt.verify(accessToken, JWT_SECRET, (err, user) =>{
        if(err)
        {
            if(err.name !== 'TokenExpiredError') return res.sendStatus(403);

            jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
                if(err) return res.sendStatus(403);
                try
                {
                    const [user_id] = await.pool.query(
                        'SELECT user_id FROM refresh_tokens WHERE refresh_token = ?',
                        [refreshToken]
                    );
                }
                catch(error)
                {
                    res.status(500).json({success: false, message : error.message});
                }

                if(user_id.length <= 0)
                {
                    return res.status(400).json({error : '데이터 베이스에서 refreshToken 데이터를 찾을 수 없습니다.'});
                }
                const accessToken = generateAccessToken(user_id[0]);      //접근 토큰 생성
                console.log(accessToken);

                res.json({accessToken});   //점근 토큰 전달
            })
        }
        else
        {
            res.json({accessToken});
        }
    })
});

module.exports = router;  //라우터 등록
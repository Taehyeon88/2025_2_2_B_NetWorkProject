using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using System.Text;
using UnityEngine.Networking;
using Newtonsoft;
using Newtonsoft.Json;

public class AuthManager : MonoBehaviour
{
    private const string SERVER_URL = "http://localhost:4000";
    private const string ACCESS_TOKEN_PREFS_KEY = "AccessToken";
    private const string REFRESH_TOKEN_PREFS_KEY = "RefreshToken";
    private const string TOKEN_EXPIRY_PREFS_KEY = "TokenExpiry";

    [HideInInspector]
    public string accessToken;
    private string refreshToken;
    private DateTime tokenExpiryTime;

    [Header("테스트용")]
    [SerializeField] private int t_playerId;
    public int userId { get; private set; }
    public string nickname { get; private set; }

    void Start()
    {
        LoadTokenFromPrefs();
    }

    private void LoadTokenFromPrefs()
    {
        accessToken = PlayerPrefs.GetString(ACCESS_TOKEN_PREFS_KEY, "");
        refreshToken = PlayerPrefs.GetString(REFRESH_TOKEN_PREFS_KEY, "");
        long expiryTicks = Convert.ToInt64(PlayerPrefs.GetString(TOKEN_EXPIRY_PREFS_KEY, "0"));
        tokenExpiryTime = new DateTime(expiryTicks);
    }

    private void SaveTokenToPrefs(string accessToken, string refreshToken, DateTime expiryTime)
    {
        PlayerPrefs.SetString(ACCESS_TOKEN_PREFS_KEY, accessToken);
        PlayerPrefs.SetString(REFRESH_TOKEN_PREFS_KEY, refreshToken);
        PlayerPrefs.SetString(TOKEN_EXPIRY_PREFS_KEY, expiryTime.Ticks.ToString());

        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiryTime = expiryTime;
    }

    // 회원가입
    public IEnumerator Register(string username, string password, string nickname, Action<bool, string> callback)
    {
        var user = new { username, password, nickname };
        var jsonData = JsonConvert.SerializeObject(user);

        using (UnityWebRequest www = new UnityWebRequest($"{SERVER_URL}/api/register", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");

            yield return www.SendWebRequest();

            Debug.Log($"[Register] responseCode: {www.responseCode}, result: {www.result}");
            Debug.Log($"[Register] body: {www.downloadHandler.text}");

            if (www.result != UnityWebRequest.Result.Success)
            {
                callback(false, www.error);     // 실패 알림
            }
            else
            {
                if (www.responseCode == 200)
                    callback(true, "회원가입 성공");
                else
                    callback(false, www.downloadHandler.text);
            }
        }
    }

    // 로그인
    public IEnumerator Login(string username, string password)
    {
        var user = new { username, password };
        var jsonData = JsonConvert.SerializeObject(user);

        using (UnityWebRequest www = new UnityWebRequest($"{SERVER_URL}/api/login", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");

            yield return www.SendWebRequest();

            Debug.Log($"[Login] responseCode: {www.responseCode}, result: {www.result}");
            if (www.downloadHandler != null)
                Debug.Log($"[Login] body: {www.downloadHandler.text}");

            if (www.result != UnityWebRequest.Result.Success)
            {
                accessToken = null;
                refreshToken = null;
                userId = 0;
                nickname = "UnKnown";
                Debug.LogError($"Login Error : {www.error}");
                yield break; // 코루틴 종료
            }
            else
            {
                try
                {
                    var response = JsonConvert.DeserializeObject<LoginResponse>(www.downloadHandler.text);
                    userId = response.user_id;
                    nickname = response.nickname;
                    SaveTokenToPrefs(response.accessToken, response.refreshToken, DateTime.UtcNow.AddMinutes(15));
                    Debug.Log("Login Successful - user_id: " + userId + $" | nickname: {nickname}");
                }
                catch (Exception ex)
                {
                    accessToken = null; // 반드시 초기화
                    refreshToken = null;
                    userId = 0;
                    nickname = "UnKnown";
                    Debug.LogError("[Login] Exception parsing response: " + ex.Message);
                    yield break;
                }
            }
        }


    }

    public IEnumerator LogOut()
    {
        var body = new { user_id = userId == 0 ? t_playerId : userId };
        var jsonData = JsonConvert.SerializeObject(body);

        using (UnityWebRequest www = new UnityWebRequest($"{SERVER_URL}/api/logout", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");

            yield return www.SendWebRequest();

            Debug.Log($"[Logout] responseCode: {www.responseCode}, body: {www.downloadHandler.text}");

            if (www.result == UnityWebRequest.Result.Success)
            {
                PlayerPrefs.DeleteKey("AccessToken");
                PlayerPrefs.DeleteKey("RefreshToken");
                PlayerPrefs.DeleteKey("TokenExpiry");

                accessToken = null;
                refreshToken = null;
                userId = 0;
                nickname = "UnKnown";

                Debug.Log("로그아웃 완료");
            }
            else
            {
                Debug.LogError($"Logout Error: {www.error}");
            }
        }
    }
    [System.Serializable]
    public class LoginResponse
    {
        public int user_id;
        public string nickname;
        public string accessToken;
        public string refreshToken;
    }

    [System.Serializable]
    public class RefreshTokenResponse
    {
        public string accessToken;
    }


}

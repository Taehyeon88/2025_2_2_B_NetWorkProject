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

    private string accessToken;
    private string refreshToken;
    private DateTime tokenExpiryTime;
    private int userId;

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
    public IEnumerator Register(string username, string password, string nickname)
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
            if (www.downloadHandler != null)
                Debug.Log($"[Register] body: {www.downloadHandler.text}");

            if (www.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError($"Register Error : {www.error}");
            }
            else
            {
                Debug.Log("Registration successful");
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
                Debug.LogError($"Login Error : {www.error}");
                Debug.LogError($"Login Response Body: {www.downloadHandler?.text}");
            }
            else
            {
                try
                {
                    var response = JsonConvert.DeserializeObject<LoginResponse>(www.downloadHandler.text);
                    if (response == null)
                    {
                        Debug.LogError("[Login] Failed to parse response JSON.");
                        yield break;
                    }

                    userId = response.user_id;
                    SaveTokenToPrefs(response.accessToken, response.refreshToken, DateTime.UtcNow.AddMinutes(15));
                    Debug.Log("Login Successful - user_id: " + userId);
                }
                catch (Exception ex)
                {
                    Debug.LogError("[Login] Exception parsing response: " + ex.Message);
                    Debug.LogError("[Login] Response body: " + www.downloadHandler.text);
                }
            }
        }
    }

    public IEnumerator LogOut(string user_id)
    {
        var user = new {user_id};
        var jsonData = JsonConvert.SerializeObject(user);

        using (UnityWebRequest www = new UnityWebRequest($"{SERVER_URL}/api/logout", "POST"))
        {
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");

            yield return www.SendWebRequest();


        }
    }   
    [System.Serializable]
    public class LoginResponse
    {
        public int user_id;
        public string accessToken;
        public string refreshToken;
    }

    [System.Serializable]
    public class RefreshTokenResponse
    {
        public string accessToken;
    }
}

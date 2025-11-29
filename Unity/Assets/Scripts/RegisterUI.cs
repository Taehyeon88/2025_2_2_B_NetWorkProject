using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class RegisterUI : MonoBehaviour
{

    public TMP_InputField inputUsername;
    public TMP_InputField inputPassword;
    public TMP_InputField inputNickname;
    public Text txtLog;

    public AuthManager authManager; // 씬에 있는 AuthManager 연결

    public void OnRegisterButton()
    {
        string username = inputUsername.text;
        string password = inputPassword.text;
        string nickname = inputNickname.text;

        StartCoroutine(authManager.Register(username, password, nickname));
        txtLog.text = "회원가입 요청 중...";
    }

    public void OnLoginButton()
    {
        string username = inputUsername.text;
        string password = inputPassword.text;

        StartCoroutine(LoginAndConnect(username, password));
        txtLog.text = "로그인 요청 중...";
    }
    private IEnumerator LoginAndConnect(string username, string password)
    {
        // 로그인 코루틴 실행
        yield return authManager.Login(username, password);

        // 로그인 성공 후
        if (!string.IsNullOrEmpty(authManager.accessToken)) 
        {
            txtLog.text = "로그인 성공! 서버 연결 중...";

            NetworkManager nm = FindObjectOfType<NetworkManager>();
            if (nm != null)
            {
                Debug.Log($"UI - 닉네임: {authManager.nickname}, 아이디: {authManager.userId}");
                nm.SetMyUserInfo(authManager.nickname, authManager.userId);

                nm.ConnectToServer();
            }
        }
        else
        {
            txtLog.text = "로그인 실패!";
        }
    }
    public void OnLogOutButton()
    {
        StartCoroutine(authManager.LogOut());

        NetworkManager nm = FindObjectOfType<NetworkManager>();
        if (nm != null)
            nm.DisconnectFromServer();   // ★ 추가

        txtLog.text = "로그아웃 됐습니다";
    }
}

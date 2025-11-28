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

        StartCoroutine(authManager.Login(username, password));
        txtLog.text = "로그인 요청 중...";
    }

    public void OnLogOutButton()
    {

        StartCoroutine(authManager.LogOut());
        txtLog.text = "로그아웃 됐습니다";
    }
}

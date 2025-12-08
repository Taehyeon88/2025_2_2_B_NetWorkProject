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

    public AuthManager authManager;

    public GameObject startUI_Panel;   // 로그인 UI 전체 묶음
    public GameObject gameUI_Panel;    // 게임 UI 전체 묶음

    public void OnRegisterButton()
    {
        string username = inputUsername.text;
        string password = inputPassword.text;
        string nickname = inputNickname.text;

        txtLog.text = "회원가입 요청 중...";

        StartCoroutine(authManager.Register(username, password, nickname,
            (success, message) =>
            {
                if (success)
                {
                    txtLog.text = "회원가입 성공!";
                }
                else
                {
                    txtLog.text = $"회원가입 실패: {message}";
                }
            }
        ));
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
        yield return authManager.Login(username, password);

        if (!string.IsNullOrEmpty(authManager.accessToken))
        {
            txtLog.text = "로그인 성공! 서버 연결 중...";

            NetworkManager nm = FindObjectOfType<NetworkManager>();
            if (nm != null)
            {
                nm.SetMyUserInfo(authManager.nickname, authManager.userId);
                nm.ConnectToServer();
            }

            // ★ UI 전환
            startUI_Panel.SetActive(false);
            gameUI_Panel.SetActive(true);
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
            nm.DisconnectFromServer();

        gameUI_Panel.SetActive(false);
        startUI_Panel.SetActive(true);

        txtLog.text = "로그아웃 됐습니다";
    }
}

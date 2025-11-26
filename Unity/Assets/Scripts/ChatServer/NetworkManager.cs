using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NativeWebSocket;
using Newtonsoft.Json;
using UnityEngine.UI;
using System;
using Unity.VisualScripting;
using Newtonsoft.Json.Converters;
[Serializable]
public class NetworkMessage
{
    public string text;            // 메시지
    public string chatType;        // GLOBAL, PARTY, GUILD, LOCAL, WHISPER
    public string connectType;     // chat, create, join, Exit
    public string playerNickName;
    public string targetNickName;  // 귓말 대상\
    public Vecter3Data position; 
    public Vecter3Data rotation;
}

public enum ChatChannel
{
    General,    // 일반
    Party,      // 파티
    Guild,      // 길드
    Local,      // 지역
    Whisper     // 귓속말
}



[Serializable]
public class Vecter3Data
{
    public float x;
    public float y;
    public float z;

    public Vecter3Data(Vector3 v)
    {
        x = v.x;
        y = v.y;
        z = v.z;
    }

    public Vector3 ToVector3()
    {
        return new Vector3(x, y, z);
    }
}

public class NetworkManager : MonoBehaviour
{
    private WebSocket webSocket;
    [SerializeField] private string serverUrl = "ws://localhost:3000";

    [Header("UI Elements")]
    [SerializeField] private InputField messageInput;
    [SerializeField] private Button connectButton;
    [SerializeField] private Text chatLog;
    [SerializeField] private Text statusText;
    [Header("PlayerSetting")]
    [SerializeField] private Transform localPlayer;     //내 플레이어
    [SerializeField] private GameObject remotePlayerPrefabs;    //다른 플레이어 Prefabs
    [SerializeField] private float positionSendRate = 0.1f;    //위치 전송 간격

    [Header("Channel Buttons")]
    [SerializeField] private Button[] channelButtons;   // General, Party, Guild, Local, Whisper 순서대로 넣기
    [SerializeField] private Color normalColor = Color.gray;
    [SerializeField] private Color selectedColor = Color.white;

    public string type;
    private string myPlayerId;
   
    private Dictionary<string, GameObject> remotePlayers = new Dictionary<string, GameObject>();
    private float lastPositionSendTime;

    private ChatChannel currentChannel = ChatChannel.General;
    // Start is called before the first frame update
    void Start()
    {
        connectButton.onClick.AddListener(ConnectToServer);

        // 엔터로 메시지 전송
        if (messageInput != null)
        {
            messageInput.onEndEdit.RemoveAllListeners();
            messageInput.onSubmit.AddListener((text) =>
            {
                SendChatMessage();
            });
        }
    }




    // Update is called once per frame
    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        if (webSocket != null) webSocket.DispatchMessageQueue();
#endif

        if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter))
        {
            if (messageInput.isFocused)
                SendChatMessage();
        }

        if (webSocket != null && webSocket.State == WebSocketState.Open && localPlayer != null)
        {
            if (Time.time - lastPositionSendTime >= positionSendRate)
            {
                SendPositionUpdate();
                lastPositionSendTime = Time.time;
            }
        }
    }

    private async void ConnectToServer()
    {
        if(webSocket != null && webSocket.State == WebSocketState.Open)
        {
            AddToChatLog("[시스템] 이미 연결되어 있습니다. ");
            return;
        }

        UpdateStatusText("연결 중...", Color.yellow);

        webSocket = new WebSocket(serverUrl);

        webSocket.OnOpen += () =>
        {
            UpdateStatusText("연결됨", Color.green);
            AddToChatLog("[시스템] 서버에 연결 되었습니다. ");
        };

        webSocket.OnError += (e) =>
        {
            UpdateStatusText("에러 발생", Color.green);
            AddToChatLog("[시스템] 에러 : {e} ");
        };

        webSocket.OnClose += (e) =>
        {
            UpdateStatusText("연결 끊김", Color.red);
            AddToChatLog("[시스템] 서버와의 연결이 끊어졌습니다. ");

            //연결 끊김 시 모든 원격 플레이어 제거
            foreach(var player in remotePlayers.Values)
            {
                if (player != null) Destroy(player);
            }
            remotePlayers.Clear();  
        };

        webSocket.OnMessage += (bytes) =>
        {
            var message = System.Text.Encoding.UTF8.GetString(bytes);
            HandleMessage(message);
        };

        await webSocket.Connect();
    }

    private void HandleMessage(string json)
    {
        try
        {
            NetworkMessage data = JsonConvert.DeserializeObject<NetworkMessage>(json);

            if (data.connectType == "chat")
            {
                DisplayChatMessage(data);
                return;
            }

            if (data.connectType == "create")
            {
                AddToChatLog($"[시스템] [{data.chatType}] 방이 생성되었습니다.");
                return;
            }

            if (data.connectType == "join")
            {
                AddToChatLog($"[시스템] [{data.playerNickName}] 가 [{data.chatType}] 방에 참여했습니다.");
                return;
            }

            if (data.connectType == "Exit")
            {
                AddToChatLog($"[시스템] [{data.playerNickName}] 가 [{data.chatType}] 방을 떠났습니다.");
                return;
            }

            if (data.chatType == "positionUpdate")
            {
                if (data.playerNickName != myPlayerId) 
                {
                    UpdateRemotePlayer(data.playerNickName, data.position, data.rotation);
                }
                return;
            }

        }

        catch (Exception e)
        {
            Debug.LogError($"메세지 처리 중 에러: {e.Message}");
        }
    }

    private void AddToChatLogColored(string message, Color color)
    {
        if (chatLog != null)
        {
            string htmlColor = UnityEngine.ColorUtility.ToHtmlStringRGBA(color);
            chatLog.text += $"\n<color=#{htmlColor}>{message}</color>";
        }
    }
    private async void SendChatMessage()
    {
        if (string.IsNullOrEmpty(messageInput.text)) return;

        if (webSocket == null || webSocket.State != WebSocketState.Open)
        {
            AddToChatLog("[시스템] 서버에 연결되지 않았습니다.");
            return;
        }

        NetworkMessage message = new NetworkMessage
        {
            chatType = "Chat",
            text = messageInput.text
        };

        await webSocket.SendText(JsonConvert.SerializeObject(message));
        messageInput.text = "";
        messageInput.ActivateInputField();            //입력창 다시 활성화
    }
    private async void SendPositionUpdate()
    {
        if (localPlayer == null) return;

        NetworkMessage message = new NetworkMessage
        {
            chatType = "positionUpdate",
            position = new Vecter3Data(localPlayer.position),
            rotation = new Vecter3Data(localPlayer.eulerAngles)

        };

        await webSocket.SendText(JsonConvert.SerializeObject(message));

    }

    private void AddToChatLog(string message)
    {
        if(chatLog != null)
        {
            chatLog.text += $"\n{message}";
        }
    }

    private void DisplayChatMessage(NetworkMessage data)
    {
        Color color = Color.white;

        switch (data.chatType)
        {
            case "GLOBAL": color = Color.white; break;
            case "PARTY": color = new Color(0.4f, 0.6f, 1f); break;
            case "GUILD": color = new Color(0.4f, 1f, 0.4f); break;
            case "LOCAL": color = new Color(1f, 0.7f, 0.3f); break;
            case "WHISPER": color = new Color(0.75f, 0.4f, 1f); break;
        }

        string sender = data.playerNickName == myPlayerId ? "나" : data.playerNickName;
        AddToChatLogColored($"[{data.chatType}] {sender}: {data.text}", color);
    }
    private void UpdateStatusText (string status, Color color)
    {
        if(statusText != null)
        {
            statusText.text = status;
            statusText.color = color;
        }
    }

    private async void OnApplicationQuit()
    {
        if(webSocket != null && webSocket.State == WebSocketState.Open)
        {
            await webSocket.Close();
        }
    }

    private void CreateRemotePlayer(string playerId, Vecter3Data position, Vecter3Data rotation)
    {
        if (remotePlayers.ContainsKey(playerId)) return;
        if (remotePlayerPrefabs == null)
        {
            Debug.LogError("RemotePlayerPrefab이 설정 되지 않았습니다.");
            return;
        }

        Vector3 pos = position != null ? position.ToVector3() : Vector3.zero;
        Vector3 rot = rotation != null ? rotation.ToVector3() : Vector3.zero;

        GameObject player = Instantiate(remotePlayerPrefabs, pos, Quaternion.Euler(rot));
        player.name = "RemotePlayer_" + playerId;
        remotePlayers.Add(playerId, player);

        Debug.Log($"원격 플레이어 생성 : {playerId} at {pos} , rotation {rot}");
    }

    private void RemoveRemotePlayer(string playerId)
    {
        if(remotePlayers.ContainsKey(playerId))
        {
            Destroy(remotePlayers[playerId]);
            remotePlayers.Remove(playerId);
            Debug.Log($"원격 플레이어 제거 : {playerId}");
        }
    }

    private void UpdateRemotePlayer(string playerId, Vecter3Data position, Vecter3Data rotation)
    {

        if(!remotePlayers.ContainsKey(playerId))     //플레이어가 없으면 생성
        {
            CreateRemotePlayer(playerId, position, rotation);
            return;
        }

        GameObject player = remotePlayers[playerId];
        if (player == null) return;

        if(position != null)      //부드러운 이동
        {
            player.transform.position = Vector3.Lerp(player.transform.position, position.ToVector3(), Time.deltaTime * 10f);
        }

        if(rotation != null)    //부드러운 회전
        {
            Quaternion targetRotation = Quaternion.Euler(rotation.ToVector3());
            player.transform.rotation = Quaternion.Lerp(player.transform.rotation, targetRotation, Time.deltaTime * 10f);
        }

    }
    private void OnDestroy()
    {
        if(connectButton != null)
        {
            connectButton.onClick.RemoveListener(ConnectToServer);
        }
    }

    public void SelectChannelGeneral() { currentChannel = ChatChannel.General; UpdateChannelUI(); }
    public void SelectChannelParty() { currentChannel = ChatChannel.Party; UpdateChannelUI(); }
    public void SelectChannelGuild() { currentChannel = ChatChannel.Guild; UpdateChannelUI(); }
    public void SelectChannelLocal() { currentChannel = ChatChannel.Local; UpdateChannelUI(); }
    public void SelectChannelWhisper() { currentChannel = ChatChannel.Whisper; UpdateChannelUI(); }

    private void UpdateChannelUI()
    {
        for (int i = 0; i < channelButtons.Length; i++)
        {
            var colors = channelButtons[i].colors;
            if (i == (int)currentChannel)
            {
                colors.normalColor = selectedColor;
                colors.selectedColor = selectedColor;
            }
            else
            {
                colors.normalColor = normalColor;
                colors.selectedColor = normalColor;
            }
            channelButtons[i].colors = colors;
        }
    }
}

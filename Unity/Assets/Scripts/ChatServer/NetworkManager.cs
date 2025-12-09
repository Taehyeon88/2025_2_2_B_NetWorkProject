using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NativeWebSocket;
using Newtonsoft.Json;
using UnityEngine.UI;
using System;
using UnityEngine.Assertions.Must;
[Serializable]
public class NetworkMessage
{
    public string user_id;         // 사용자 고유 ID
    public string text;            // 메시지
    public string type;            // login, positionUpdate, close
    public string chatType;        // GLOBAL, PARTY, GUILD, REGION, WHISPER
    public string connectType;     // chat, create, join, Exit
    public string target_nickname;  // 귓말 대상 닉네임
    public string target_id;        // 파티 가입 대상 유저 아이디
    public Vecter3Data position; 
    public Vecter3Data rotation;

    public string nickname;       //닉네임 (공용)

    public string error;          //서버의 피드백을 받는용
    public string guildName;
}

public enum ChatChannel
{
    General,    // 일반
    Party,      // 파티
    Guild,      // 길드
    Region,      // 지역
    Whisper     // 귓속말
}

public enum ConnectType
{
    create,
    join,
    chat,
    exit
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
    public static NetworkManager Instance { get; private set; }

    private WebSocket webSocket;
    [SerializeField] private string serverUrl = "ws://localhost:4000";

    [Header("UI Elements")]
    [SerializeField] private InputField messageInput;
    [SerializeField] private Text chatLog;
    [SerializeField] private Text statusText;
    [SerializeField] private ScrollRect chatScrollRect;
    [Header("PlayerSetting")]
    [SerializeField] private GameObject playerPrefab;     //내 플레이어
    public GameObject localPlayer;    //다른 플레이어 Prefabs
    [SerializeField] private float positionSendRate = 0.1f;    //위치 전송 간격
    public GameObject remotePlayerPrefab;
    [Header("Channel Buttons")]
    [SerializeField] private Button[] channelButtons;   // General, Party, Guild, Local, Whisper 순서대로 넣기
    [SerializeField] private Color normalColor = Color.gray;
    [SerializeField] private Color selectedColor = Color.white;

    [HideInInspector]
    public string type;

    [Header("플레이어 ID")]      //테스트용을 전부 인스팩터창에 띄움
    public string myPlayerId;   //로그인 시 받게 되는 user_id
    [SerializeField] private ChatChannel currentChannel = ChatChannel.General;
    [SerializeField] private ConnectType currentConnectType = ConnectType.chat;
    [SerializeField] private Button connectButton;

    [HideInInspector]
    public string myNickname;  //로그인 시 받게 되는 user_nickname

    private Dictionary<string, GameObject> remotePlayers = new Dictionary<string, GameObject>();
    private float lastPositionSendTime;

    [Header("Guild UI")]
    [SerializeField] private GameObject guildPanel;       // 오른쪽 하단 길드 창
    [SerializeField] private InputField guildNameInput;    // 길드 생성용
    [SerializeField] private Button createGuildButton;     // 생성 버튼
    [SerializeField] private Transform guildListContent;   // 길드 목록 Content (ScrollView)
    [SerializeField] private GameObject guildItemPrefab;
    [SerializeField] private Button joinGuildButton;      // Join 버튼
    [SerializeField] private Button exitGuildButton;

    [Header("Party Invite UI")]
    [SerializeField] private GameObject partyInvitePanel;
    [SerializeField] private Button acceptButton;
    [SerializeField] private Button declineButton;
    [SerializeField] private Button leavePartyButton;

    private bool ignoreInputThisFrame = false; 

    private string currentInviterId;
    private string currentInviterNickname;

    private Dictionary<string, string> currentParty = new Dictionary<string, string>(); // key: playerId, value: nickname

    private Dictionary<ChatChannel, string> chatLogs = new Dictionary<ChatChannel, string>();
    private string whisperLog = "";

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        // 기존 Awake 코드
        if (chatScrollRect != null && chatLog != null)
        {
            chatScrollRect.content = chatLog.rectTransform;
        }
    }
    // Start is called before the first frame update
    void Start()
    {
        if (leavePartyButton != null)
        {
            leavePartyButton.onClick.AddListener(() =>
            {
                ExitParty();
            });
        }

        foreach (ChatChannel channel in Enum.GetValues(typeof(ChatChannel)))
        {
            chatLogs[channel] = ""; // 초기화
        }

        if (connectButton != null)
            connectButton.onClick.AddListener(ConnectToServer);


        if (messageInput != null)
        {
            messageInput.onEndEdit.RemoveAllListeners();
            messageInput.onSubmit.AddListener((text) => { SendChatMessage(); });
        }

        if (createGuildButton != null)
            createGuildButton.onClick.AddListener(() =>
            {
                string guildName = guildNameInput.text;
                CreateGuild(guildName);
            });
        exitGuildButton.onClick.AddListener(ExitGuild);
    }


    public async void SendPartyInvite(string targetPlayerId)
    {
        if (webSocket == null || webSocket.State != WebSocketState.Open) return;

        NetworkMessage msg = new NetworkMessage()
        {
            connectType = "partyInvite",
            target_id = targetPlayerId,
            chatType = "PARTY"
        };
        await webSocket.SendText(JsonConvert.SerializeObject(msg));
        AddToChatLog($"[시스템] {targetPlayerId}에게 파티 초대를 보냈습니다.");

        if (!currentParty.ContainsKey(myPlayerId))
            currentParty.Add(myPlayerId, myNickname);

        UpdatePartyUI();  
    }

    public async void ExitParty()
    {
        if (webSocket == null || webSocket.State != WebSocketState.Open) return;

        NetworkMessage msg = new NetworkMessage()
        {
            connectType = "exit",
            chatType = "PARTY"
        };
        await webSocket.SendText(JsonConvert.SerializeObject(msg));

        currentParty.Clear();
        AddToChatLog("[시스템] 파티를 탈퇴했습니다.");

        UpdatePartyUI(); // UI 갱신
    }

    public void InitializePartyUI(Dictionary<string, string> existingParty)
    {
        if (existingParty != null)
            currentParty = new Dictionary<string, string>(existingParty);

        UpdatePartyUI();
    }

    public async void AcceptParty(string inviterId, string inviterNickname)
    {
        if (webSocket == null || webSocket.State != WebSocketState.Open) return;

        NetworkMessage msg = new NetworkMessage()
        {
            connectType = "join",
            chatType = "PARTY",
            target_id = inviterId,
            nickname = myNickname
        };

        await webSocket.SendText(JsonConvert.SerializeObject(msg));

        // 로컬에서도 바로 추가
        if (!currentParty.ContainsKey(inviterId))
            currentParty.Add(inviterId, inviterNickname);

        AddToChatLog($"[시스템] {inviterNickname}님과 파티를 맺었습니다.");

        UpdatePartyUI(); // UI 갱신
    }

    private void UpdatePartyUI()
    {
        leavePartyButton.gameObject.SetActive(currentParty.Count > 0);
    }
    public async void CreateGuild(string guildName)
    {
        if (string.IsNullOrEmpty(guildName)) return;

        NetworkMessage msg = new NetworkMessage()
        {
            text = guildName,
            chatType = "GUILD",
            connectType = "create"
        };

        if (webSocket != null && webSocket.State == WebSocketState.Open)
            await webSocket.SendText(JsonConvert.SerializeObject(msg));
    }

    public async void JoinGuild(string guildName)
    {
        NetworkMessage msg = new NetworkMessage()
        {
            text = guildName,
            chatType = "GUILD",
            connectType = "join"
        };

        if (webSocket != null && webSocket.State == WebSocketState.Open)
            await webSocket.SendText(JsonConvert.SerializeObject(msg));
    }


    public async void ExitGuild()
    {
        NetworkMessage msg = new NetworkMessage()
        {
            chatType = "GUILD",
            connectType = "exit"
        };

        if (webSocket != null && webSocket.State == WebSocketState.Open)
            await webSocket.SendText(JsonConvert.SerializeObject(msg));
    }

    private void UpdateGuildUI(string guildName, string playerId, string action)
    {
        Transform existing = guildListContent.Find(guildName);
        if (existing != null) return;

        GameObject item = Instantiate(guildItemPrefab, guildListContent);
        item.transform.SetAsFirstSibling();
        item.name = guildName;

        Text txt = item.GetComponentInChildren<Text>();
        txt.text = guildName;

        Button btn = item.GetComponentInChildren<Button>();  
        btn.onClick.RemoveAllListeners();
    }

    private void DeleteGuildUI(string guildName)
    {
        Transform existing = guildListContent.Find(guildName);

        if (existing == null) return;

        Destroy(existing.gameObject);    
    }

    public void OnWebSocketConnected()
    {
        SpawnLocalPlayer();
    }

    public void SetMyUserInfo(string nickname, int id)
    {
        Debug.Log($"서버 - 닉네임: {nickname}, 아이디: {id}");
        myNickname = nickname;
        myPlayerId = id.ToString();
    }
    private void SpawnLocalPlayer()
    {
        if (localPlayer != null) return;

        Vector3 spawnPos = new Vector3(0, 1, 0);
        localPlayer = Instantiate(playerPrefab, spawnPos, Quaternion.identity);

        PlayerController pc = localPlayer.GetComponent<PlayerController>();
        pc.myPlayerId = myNickname;
        pc.myPlayerNickName = myNickname;
        pc.isLocalPlayer = true;

        ThirdPersonCamera cam = Camera.main.GetComponent<ThirdPersonCamera>();
        if (cam != null)
        {
            cam.SetTarget(localPlayer.transform);
        }
    }

    // Update is called once per frame
    void Update()
    {

        if (ignoreInputThisFrame)
        {
            ignoreInputThisFrame = false; 
                                         
            return;
        }

#if !UNITY_WEBGL || UNITY_EDITOR
        if (webSocket != null) webSocket.DispatchMessageQueue();
#endif

        // 위치 전송
        if (webSocket != null && webSocket.State == WebSocketState.Open && localPlayer != null)
        {
            if (Time.time - lastPositionSendTime >= positionSendRate)
            {
                SendPositionUpdate();
                lastPositionSendTime = Time.time;
            }
        }

        if ((Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter))
            && messageInput != null
            && !messageInput.isFocused)
        {
            messageInput.ActivateInputField();

            ThirdPersonCamera cam = Camera.main.GetComponent<ThirdPersonCamera>();
            if (cam != null)
                cam.enabled = false;

            if (NetworkManager.Instance.localPlayer != null)
            {
                PlayerController pc = NetworkManager.Instance.localPlayer.GetComponent<PlayerController>();
                if (pc != null)
                    pc.enabled = false;
            }
        }

        if (Input.GetKeyDown(KeyCode.Escape) && messageInput != null && messageInput.isFocused)
        {
            EndChatInput();
        }
    }

    private void EndChatInput()
    {
        messageInput.DeactivateInputField();

        // 플레이어 입력 복구
        if (NetworkManager.Instance.localPlayer != null)
        {
            PlayerController pc = NetworkManager.Instance.localPlayer.GetComponent<PlayerController>();
            if (pc != null)
            {
                pc.enabled = true;

                Input.ResetInputAxes();
            }

            ThirdPersonCamera cam = Camera.main.GetComponent<ThirdPersonCamera>();
            if (cam != null)
                cam.enabled = true;
        }
    }

    public async void ConnectToServer()      
    {
        if(webSocket != null && webSocket.State == WebSocketState.Open)
        {
            AddToChatLog("[시스템] 이미 연결되어 있습니다. ");
            return;
        }

        UpdateStatusText("연결 중...", Color.yellow);

        webSocket = new WebSocket(serverUrl);

        webSocket.OnOpen += async () =>
        {
            UpdateStatusText("연결됨", Color.green);
            AddToChatLog("[시스템] 서버에 연결되었습니다.");

            OnWebSocketConnected();

            NetworkMessage message = new NetworkMessage()      //서버 접속과 동시에 서버에게 전달
            {
                type = "login",
                user_id = myPlayerId,
                position = new Vecter3Data(localPlayer.transform.position),
                rotation = new Vecter3Data(localPlayer.transform.eulerAngles)
            };
            await webSocket.SendText(JsonConvert.SerializeObject(message)); 
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

    public async void DisconnectFromServer()
    {
        if (webSocket != null && webSocket.State == WebSocketState.Open)
        {
            await webSocket.Close();   
            webSocket = null;
        }

        // Remote Player 정리
        foreach (var player in remotePlayers.Values)
        {
            if (player != null) Destroy(player);
        }
        remotePlayers.Clear();

        if (localPlayer != null)
        {
            Destroy(localPlayer);
            localPlayer = null;
        }

        AddToChatLog("[시스템] 서버 연결 종료");
    }

    private void HandleMessage(string json)
    {
        try
        {
            NetworkMessage data = JsonConvert.DeserializeObject<NetworkMessage>(json);

            if (!string.IsNullOrEmpty(data.error))
            {
                AddToChatLog($"[시스템] {data.error}");
                Debug.Log($"서버의 피드백 : {data.error}");
            }

            if (data.chatType == "GUILD")
            {
                if (data.connectType == "create" || data.connectType == "join")
                {
                    string guildName = data.guildName; 
                    UpdateGuildUI(guildName, myPlayerId, data.connectType);
                }
                else if (data.connectType == "destroy")
                {
                    DeleteGuildUI(data.guildName);
                }
                
            }

            switch (data.connectType)     
            {

                case "partyInvite":
                    if (data.target_id == myPlayerId)
                    {
                        AddToChatLog($"[시스템] {data.nickname}님이 파티 초대를 보냈습니다.");

                        currentInviterId = data.user_id;       
                        currentInviterNickname = data.nickname;
                        partyInvitePanel.SetActive(true);

                        acceptButton.onClick.RemoveAllListeners();
                        acceptButton.onClick.AddListener(() =>
                        {
                            AcceptParty(currentInviterId, currentInviterNickname);
                            partyInvitePanel.SetActive(false);
                        });

                        declineButton.onClick.RemoveAllListeners();
                        declineButton.onClick.AddListener(() =>
                        {
                            partyInvitePanel.SetActive(false);
                            AddToChatLog($"[시스템] {currentInviterNickname}님의 파티 초대를 거절했습니다.");
                        });
                    }
                    break;

                case "create":
                    AddToChatLog(data.text);
                    break;
                case "join":
                    AddToChatLog(data.text);
                    break;
                case "chat":
                    DisplayChatMessage(data);
                    break;
                case "exit":
                    AddToChatLog(data.text);
                    RemoveRemotePlayer(data.user_id);
                    break;
                case "destroy":
                    AddToChatLog(data.text);
                    break;
            }

            switch (data.type)     //채팅 관련 메세지를 올리는 부분
            {
                case "login":
                    AddToChatLog(data.text);
                    break;

                case "positionUpdate":
                    if (data.user_id != myPlayerId)
                        UpdateRemotePlayer(data.user_id, data.nickname, data.position, data.rotation);
                    break;

                case "playerJoin":
                    if (data.user_id != myPlayerId)
                        AddToChatLog(data.text);
                    break;

                case "close":
                    AddToChatLog(data.text);
                    RemoveRemotePlayer(data.user_id);
                    break;
            }
            //Debug.Log($"받은 데이터: {json}");
        }

        catch (Exception e)
        {
            Debug.LogError($"메시지 처리 중 에러: {e}");
        }
    }

    private void AddToChatLogColored(string message, Color color, ChatChannel channel)
    {
        string htmlColor = ColorUtility.ToHtmlStringRGBA(color);
        string formatted = $"<color=#{htmlColor}>{message}</color>\n";

        // 귓속말이면 전용 log + 일반에도 표시
        if (channel == ChatChannel.Whisper)
        {
            whisperLog += formatted;
            chatLogs[ChatChannel.General] += formatted;
        }
        else
        {
            chatLogs[channel] += formatted;
        }

        // 현재 선택된 채널 화면에 적용
        if (chatLog != null)
        {
            if (currentChannel == ChatChannel.General || currentChannel == ChatChannel.Whisper)
                chatLog.text = chatLogs[ChatChannel.General]; 
            else
                chatLog.text = chatLogs[currentChannel];

            Canvas.ForceUpdateCanvases();
            chatScrollRect.verticalNormalizedPosition = 0f;
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

        NetworkMessage msg = new NetworkMessage();
        msg.text = messageInput.text;

        // 기존 채널/커넥트 타입 처리
        switch (currentConnectType)
        {
            case ConnectType.create: msg.connectType = "create"; break;
            case ConnectType.join: msg.connectType = "join"; break;
            case ConnectType.chat: msg.connectType = "chat"; break;
            case ConnectType.exit: msg.connectType = "exit"; break;
        }

        switch (currentChannel)
        {
            case ChatChannel.General: msg.chatType = "GLOBAL"; break;
            case ChatChannel.Party: msg.chatType = "PARTY"; break;
            case ChatChannel.Guild: msg.chatType = "GUILD"; break;
            case ChatChannel.Region: msg.chatType = "REGION"; break;
            case ChatChannel.Whisper:
                msg.chatType = "WHISPER";
                msg.target_nickname = ExtractTargetNick(messageInput.text);
                msg.text = ExtractWhisperMessage(messageInput.text);
                break;
        }

        await webSocket.SendText(JsonConvert.SerializeObject(msg));

        // 채팅 입력 종료
        messageInput.text = "";
        messageInput.DeactivateInputField();

        ignoreInputThisFrame = true;

        // 카메라와 플레이어 입력 복구
        ThirdPersonCamera cam = Camera.main.GetComponent<ThirdPersonCamera>();
        if (cam != null)
            cam.enabled = true;

        if (NetworkManager.Instance.localPlayer != null)
        {
            // PlayerController 활성화
            PlayerController pc = NetworkManager.Instance.localPlayer.GetComponent<PlayerController>();
            if (pc != null)
                pc.enabled = true;

            // 카메라 타겟 설정
            if (cam != null)
                cam.SetTarget(NetworkManager.Instance.localPlayer.transform);
        }

        EndChatInput();
    }

    private string ExtractTargetNick(string rawMessage)
    {
        string[] split = rawMessage.Split(' ');
        return split.Length > 1 ? split[1] : null;
    }

    private string ExtractWhisperMessage(string rawMessage)
    {
        string[] split = rawMessage.Split(' ');
        return split.Length > 2 ? string.Join(" ", split, 2, split.Length - 2) : "";
    }

    private async void SendPositionUpdate()
    {
        if (localPlayer == null) return;

        NetworkMessage message = new NetworkMessage()
        {
            type = "positionUpdate",
            position = new Vecter3Data(localPlayer.transform.position),
            rotation = new Vecter3Data(localPlayer.transform.eulerAngles)
        };
        await webSocket.SendText(JsonConvert.SerializeObject(message));
    }

    private void AddToChatLog(string message)
    {
        if (chatLog != null)
        {
            // 현재 채널 기록에 추가
            chatLogs[currentChannel] += message + "\n";

            // 화면에 보여주기
            chatLog.text = chatLogs[currentChannel];

            // 스크롤 아래로
            Canvas.ForceUpdateCanvases();
            chatScrollRect.verticalNormalizedPosition = 0f;
        }
    }
    

    private void DisplayChatMessage(NetworkMessage data)
    {
        Color color = Color.white;
        ChatChannel channel = ChatChannel.General;

        switch (data.chatType)
        {
            case "GLOBAL": channel = ChatChannel.General; color = Color.white; break;
            case "PARTY": channel = ChatChannel.Party; color = new Color(0.4f, 0.6f, 1f); break;
            case "GUILD": channel = ChatChannel.Guild; color = new Color(0.4f, 1f, 0.4f); break;
            case "REGION": channel = ChatChannel.Region; color = new Color(1f, 0.7f, 0.3f); break;
            case "WHISPER": channel = ChatChannel.Whisper; color = new Color(0.75f, 0.4f, 1f); break;
        }

        AddToChatLogColored(data.text, color, channel);
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
    public void SpawnRemotePlayer(string playerId, string playerNickName)
    {
        if (remotePlayers.ContainsKey(playerId)) return;

        Vector3 spawnPos = new Vector3(0, 1, 0);
        GameObject remote = Instantiate(remotePlayerPrefab, spawnPos, Quaternion.identity);

        PlayerController pc = remote.GetComponent<PlayerController>();
        pc.myPlayerId = playerId;
        pc.myPlayerNickName = playerNickName;
        pc.isLocalPlayer = false;

        remotePlayers.Add(playerId, remote);
    }

    private void CreateRemotePlayer(string playerId, string playerNickName, Vecter3Data position, Vecter3Data rotation)
    {
        if (remotePlayers.ContainsKey(playerId)) return;

        Vector3 spawnPos = position != null ? position.ToVector3() : new Vector3(0, 1, 0);
        Quaternion spawnRot = rotation != null ? Quaternion.Euler(rotation.ToVector3()) : Quaternion.identity;

        GameObject newPlayer = Instantiate(remotePlayerPrefab, spawnPos, spawnRot);

        PlayerController pc = newPlayer.GetComponent<PlayerController>();
        pc.myPlayerId = playerId;
        pc.myPlayerNickName = playerNickName;
        pc.isLocalPlayer = false;


        remotePlayers.Add(playerId, newPlayer);
    }

    private void RemoveRemotePlayer(string playerId)
    {
        if (remotePlayers.ContainsKey(playerId))
        {
            Destroy(remotePlayers[playerId]);
            remotePlayers.Remove(playerId);
            Debug.Log($"원격 플레이어 제거 : {playerId}");
        }
    }

    private void UpdateRemotePlayer(string playerId, string playerNickName, Vecter3Data position, Vecter3Data rotation)
    {
        if (!remotePlayers.ContainsKey(playerId))
        {
            CreateRemotePlayer(playerId, playerNickName, position, rotation);
            return;
        }

        GameObject player = remotePlayers[playerId];
        if (player == null) return;

        if (position != null)
            player.transform.position = Vector3.Lerp(player.transform.position, position.ToVector3(), Time.deltaTime * 10f);

        if (rotation != null)
            player.transform.rotation = Quaternion.Lerp(player.transform.rotation, Quaternion.Euler(rotation.ToVector3()), Time.deltaTime * 10f);
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
    public void SelectChannelLocal() { currentChannel = ChatChannel.Region; UpdateChannelUI(); }
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

        // 선택한 채널 기록 화면에 표시
        if (chatLog != null)
        {
            chatLog.text = chatLogs[currentChannel];
            Canvas.ForceUpdateCanvases();
            chatScrollRect.verticalNormalizedPosition = 0f;
        }
    }


}

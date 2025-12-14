using System.Collections;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class PlayerController : MonoBehaviour
{
    public string myPlayerId;
    public string myPlayerNickName;
    public bool isLocalPlayer;
    public string myGuildName;

    [Header("Movement Settings")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float rotateSpeed = 720f; // 회전 속도
    private Transform cameraTransform;


    public GameObject playerUIParent;
    public Text nameTag;
    public Text guildTag;


    public Text chatText;     
    private GameObject chatBubble; 

    private Vector3 moveDirection;

    private GameObject localPlayer;

    void Start()
    {
        // 1) 닉네임, 길드이름 태그 찾기
        nameTag = GetComponentsInChildren<Text>(true)
                    .FirstOrDefault(t => t.name == "NickName");

        guildTag = GetComponentsInChildren<Text>(true)
                     .FirstOrDefault(t => t.name == "GuidName");

        if (nameTag != null)
        {
            nameTag.text = myPlayerNickName;
            if (isLocalPlayer)
                nameTag.gameObject.SetActive(false);
        }
        else
        {
            Debug.LogError($"[{name}] NickName Text 못 찾음");
        }

        if (guildTag != null)
        {
            guildTag.text = myGuildName;
            if (isLocalPlayer)
                guildTag.gameObject.SetActive(false);
        }
        else
        {
            Debug.LogError($"[{name}] GuildName Text 못 찾음");
        }

        // 2) 챗버블 찾기 (무조건 GetComponentInChildren 사용)
        chatBubble = transform.Find("ChatBubble")?.gameObject;

        if (chatBubble == null)
        {
            Debug.LogError("ChatBubble 오브젝트 못 찾음!");
        }
        else
        {
            chatText = chatBubble.GetComponentsInChildren<Text>(true)
                                 .FirstOrDefault(t => t.name == "ChatText");

            if (chatText == null)
                Debug.LogError("ChatText 못 찾음!");

            // 텍스트만 끄기
            chatText.gameObject.SetActive(false);
        }

        // 4) 카메라
        cameraTransform = Camera.main != null ? Camera.main.transform : null;
    }

    private void OnEnable()
    {
        if (localPlayer == null && !isLocalPlayer)
            localPlayer = GameObject.FindWithTag("LocalPlayer");
    }

    void LateUpdate()
    {
        if (cameraTransform == null) return;

        // 카메라 방향에서 Y축만 반영
        Vector3 dir = cameraTransform.forward;
        dir.y = 0;
        dir.Normalize();

        if(!isLocalPlayer)
        {
            Vector3 direction = (transform.position - localPlayer.transform.position).normalized;
            direction.y = 0;
            Quaternion quaternion = Quaternion.LookRotation(direction, Vector3.up);

            // 닉네임
            if (playerUIParent != null)
                playerUIParent.transform.rotation = quaternion;

            if (guildTag != null)
                guildTag.text = myGuildName;

            // 말풍선
            if (chatBubble != null)
                chatBubble.transform.rotation = quaternion;
        }
    }
    public void ShowChatBubble(string msg)
    {
        if (chatText == null)
        {
            Debug.LogError("CHAT TEXT NULL!!!!!");
            return;
        }

        chatText.text = msg;
        chatText.gameObject.SetActive(true);
        StartCoroutine(HideChatBubbleAfterDelay());
    }
    IEnumerator HideChatBubbleAfterDelay()
    {
        yield return new WaitForSeconds(5f);
        chatText.gameObject.SetActive(false);
    }

    void Update()
    {
        if (!isLocalPlayer) return;

        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        Vector3 forward = cameraTransform.forward;
        Vector3 right = cameraTransform.right;
        forward.y = 0;
        right.y = 0;
        forward.Normalize();
        right.Normalize();

        moveDirection = (forward * vertical + right * horizontal).normalized;

        transform.position += moveDirection * moveSpeed * Time.deltaTime;

        if (moveDirection != Vector3.zero)
        {
            Quaternion targetRotation = Quaternion.LookRotation(moveDirection);
            transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRotation, rotateSpeed * Time.deltaTime);
        }
    }

    void OnMouseOver()
    {
        if (Input.GetMouseButtonDown(1)) // 오른쪽 클릭
        {
            string targetId = this.myPlayerId;
            NetworkManager.Instance.SendPartyInvite(targetId);
        }
    }
}

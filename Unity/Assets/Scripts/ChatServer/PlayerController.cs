using System.Collections;
using System.Collections.Generic;
using TMPro;
using Unity.VisualScripting;
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

    [HideInInspector]
    public Text nameTag; // 프리팹에 있는 Text를 참조

    private Vector3 moveDirection;

    void Start()
    {
        nameTag = GetComponentInChildren<Text>();
        if (nameTag != null)
        {
            nameTag.text = myPlayerNickName;

            if (isLocalPlayer)
                nameTag.gameObject.SetActive(false); 
        }

        cameraTransform = Camera.main.transform;
    }

    void LateUpdate()
    {
        if (nameTag != null && cameraTransform != null)
        {
            Vector3 camPos = cameraTransform.position;
            Vector3 tagPos = nameTag.transform.position;

            Vector3 direction = new Vector3(camPos.x - tagPos.x, 0f, camPos.z - tagPos.z);

            if (direction.sqrMagnitude > 0.001f)
            {
                nameTag.transform.rotation = Quaternion.LookRotation(direction);
                nameTag.transform.Rotate(0, 180, 0); 
            }
        }
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

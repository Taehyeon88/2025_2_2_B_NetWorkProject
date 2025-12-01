using System.Collections;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public string myPlayerId;
    public string myPlayerNickName;
    public bool isLocalPlayer;

    [Header("Movement Settings")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float rotateSpeed = 720f; // 회전 속도
    private Transform cameraTransform;

    private Vector3 moveDirection;

    void Start()
    {
        if (isLocalPlayer)
        {
            cameraTransform = Camera.main.transform; // 카메라 기준 이동
        }
    }

    void Update()
    {
        if (!isLocalPlayer) return;

        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        // 카메라 기준 이동 벡터 계산
        Vector3 forward = cameraTransform.forward;
        Vector3 right = cameraTransform.right;
        forward.y = 0;
        right.y = 0;
        forward.Normalize();
        right.Normalize();

        moveDirection = (forward * vertical + right * horizontal).normalized;

        // 이동
        transform.position += moveDirection * moveSpeed * Time.deltaTime;

        // 이동 방향으로 회전
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

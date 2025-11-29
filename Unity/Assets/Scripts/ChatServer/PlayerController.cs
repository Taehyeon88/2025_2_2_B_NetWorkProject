using System.Collections;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public string myPlayerId;  // ★ NetworkManager에서 채워줌
    public string myPlayerNickName; // ★ NetworkManager에서 채워줌
    public bool isLocalPlayer; // ★ 내가 조종하는 플레이어인지 구분
    [Header("Movement Settings")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float rotateSpeed = 100f;
    // Start is called before the first frame update


    // Update is called once per frame
    void Update()
    {
        if (!isLocalPlayer) return; // 다른 플레이어는 입력 무시

        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        Vector3 moveDirection = transform.forward * vertical;
        transform.position += moveDirection * moveSpeed * Time.deltaTime;

        transform.Rotate(Vector3.up * horizontal * rotateSpeed * Time.deltaTime);
    }
}

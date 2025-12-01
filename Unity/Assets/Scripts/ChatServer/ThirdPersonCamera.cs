using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using static UnityEngine.GraphicsBuffer;

public class ThirdPersonCamera : MonoBehaviour
{
    [SerializeField] private Transform target; // 플레이어
    [SerializeField] private Vector3 offset = new Vector3(0, 3, -5);
    [SerializeField] private float smoothSpeed = 5f;
    [SerializeField] private float rotationSpeed = 5f; // 마우스 회전 속도

    private float yaw = 0f; // 좌우 회전
    private float pitch = 20f; // 상하 회전 제한

    void LateUpdate()
    {
        if (target == null) return;

        // 마우스로 카메라 회전
        yaw += Input.GetAxis("Mouse X") * rotationSpeed;
        pitch -= Input.GetAxis("Mouse Y") * rotationSpeed;
        pitch = Mathf.Clamp(pitch, -10f, 60f); // 상하 제한

        Quaternion rotation = Quaternion.Euler(pitch, yaw, 0);
        Vector3 desiredPosition = target.position + rotation * offset;

        transform.position = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);
        transform.LookAt(target.position + Vector3.up * 1.5f); // 플레이어 머리 바라보기
    }

    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
        // 카메라 회전 초기값 맞춤
        yaw = target.eulerAngles.y;
    }
}

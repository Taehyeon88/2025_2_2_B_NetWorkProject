using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using static UnityEngine.GraphicsBuffer;

public class ThirdPersonCamera : MonoBehaviour
{
    [SerializeField] private Transform target; 
    [SerializeField] private Vector3 offset = new Vector3(0, 3, -5);
    [SerializeField] private float smoothSpeed = 5f;
    [SerializeField] private float rotationSpeed = 5f; 

    private float yaw = 0f; // 좌우 회전
    private float pitch = 20f; // 상하 회전 제한

    void LateUpdate()
    {
        if (target == null) return;

        // 마우스로 카메라 회전
        yaw += Input.GetAxis("Mouse X") * rotationSpeed;
        pitch -= Input.GetAxis("Mouse Y") * rotationSpeed;
        pitch = Mathf.Clamp(pitch, -10f, 60f); 

        Quaternion rotation = Quaternion.Euler(pitch, yaw, 0);
        Vector3 desiredPosition = target.position + rotation * offset;

        transform.position = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);
        transform.LookAt(target.position + Vector3.up * 1.5f); 
    }

    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
        yaw = target.eulerAngles.y;
    }
}

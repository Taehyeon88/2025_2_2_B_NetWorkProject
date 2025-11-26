using System.Collections;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;

public class PlayerController : MonoBehaviour
{

    [Header("Movement Settings")]
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float rotateSpeed = 100f;
    // Start is called before the first frame update


    // Update is called once per frame
    void Update()
    {
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        Vector3 moveDirection = transform.forward * vertical;
        transform.position += moveDirection * moveSpeed * Time.deltaTime;

        transform.Rotate(Vector3.up * horizontal * rotateSpeed * Time.deltaTime);
    }
}

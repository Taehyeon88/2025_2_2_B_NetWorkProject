using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GuildOpener : MonoBehaviour
{
    [SerializeField] private GameObject guildCanvas;

    void Start()
    {
        if (guildCanvas != null)
            guildCanvas.SetActive(false);
    }

    void OnMouseDown()
    {
        if (!guildCanvas.activeSelf)
            OpenGuild();
    }

    private void OpenGuild()
    {
        guildCanvas.SetActive(true);

        ThirdPersonCamera cam = Camera.main.GetComponent<ThirdPersonCamera>();
        if (cam != null)
            cam.enabled = false;
    }
}

using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GuildCanvasController : MonoBehaviour
{
    [SerializeField] private GameObject guildCanvas;

    private void CloseGuild()
    {
        guildCanvas.SetActive(false);

        ThirdPersonCamera cam = Camera.main.GetComponent<ThirdPersonCamera>();
        if (cam != null)
            cam.enabled = true;

        var localPlayer = NetworkManager.Instance.localPlayer;
        if (localPlayer != null)
        {
            PlayerController pc = localPlayer.GetComponent<PlayerController>();
            if (pc != null)
                pc.enabled = true;
        }
    }
}

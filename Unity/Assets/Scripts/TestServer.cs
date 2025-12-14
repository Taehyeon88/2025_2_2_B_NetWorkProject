using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

public class TestServer : MonoBehaviour
{

    private void Start()
    {
        Test();
    }
    IEnumerator Test()
    {
        using (UnityWebRequest www =
               UnityWebRequest.Get("http://218.237.137.145:4000"))
        {
            yield return www.SendWebRequest();
            Debug.Log(www.result);
            Debug.Log(www.error);
            Debug.Log(www.responseCode);
        }
    }
}

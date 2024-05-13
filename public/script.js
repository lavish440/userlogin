function SendRequest() {
  function postJSON() {
    // var response = fetch("http://localhost:3000/jwt", {
    // 	method: "POST",
    // 	headers: {
    // 		"Content-Type": "application/json",
    // 	},
    // 	body: JSON.stringify(data),
    // });

    fetch("http://localhost:3000/jwt", {
      method: "POST",
      body: JSON.stringify({
        email: "lavish@example",
        password: "lavi",
      }),
      headers: {
        "Content-type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((json) => {
        Val = json;
        console.log(Val);
        // document.cookie(`token=[Val]`);
        window.localStorage.setItem("token", Val["token"]);
        console.log("cokis : ", localStorage.getItem("token"));
      });
  }

  var email = document.getElementById("email").value;
  var password = document.getElementById("password").value;
  // alert("Username: " + email + " Password: " + password);
  // var data = {email: email, password: password};
  postJSON();
  // alert("cookie aa gyi ", localStorage.getItem("token"));

  function makeRequest() {
    var key = window.localStorage.getItem("token");
    var url = "http://localhost:3000/main";
    // alert(key);
    document.write(httpGet(url, key));
    // window.location.replace("/main");
  }

  function httpGet(url, key) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.setRequestHeader("Authorization", "Bearer " + key);
    xmlHttp.send(null);
    return xmlHttp.responseText;
  }
  makeRequest();
}

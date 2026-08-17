import { useState } from "react";
import axios from "axios";

function Signin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();

    if (username === "" || password === "") {
      console.log("Please enter username and password");
    } else {
      const response = await axios.post(
        "http://localhost:4000/signin",
        {
          username: username,
          password: password,
        }
      );

      if (response.data.message === "Signin successful") {
        console.log("Signin successful");
      } else {
        console.log("Invalid username or password");
      }
    }
  }


  return (
    <div>
      <h1>Sign In</h1>

      <form onSubmit={handleSignin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Sign In</button>
      </form>
    </div>
  );
}

export default Signin;
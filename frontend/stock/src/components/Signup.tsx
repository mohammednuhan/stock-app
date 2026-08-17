import { useState } from "react";
import axios from "axios";

function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (username === "" || password === "") {
      console.log("Please enter username and password");
    } else {
      const response = await axios.post(
        "http://localhost:4000/signup",
        {
          username: username,
          password: password,
        }
      );
      console.log(response.data)

      if (response.data.message === "Signup successful") {
        console.log("Signup successful");
      } else {
        console.log("Signup failed");
      }
    }
  }

  return (
    <div>
      <h1>Signup</h1>

      <form onSubmit={handleSignup}>
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

        <button type="submit">Signup</button>
      </form>
    </div>
  );
}

export default Signup;
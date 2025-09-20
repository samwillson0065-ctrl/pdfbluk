import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    if (password === process.env.NEXT_PUBLIC_APP_PASSWORD) {
      localStorage.setItem("authenticated", "true");
      router.push("/");
    } else {
      alert("Wrong password!");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 420, margin: "auto" }}>
      <h2>Login</h2>
      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", margin: "8px 0", padding: "8px" }}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
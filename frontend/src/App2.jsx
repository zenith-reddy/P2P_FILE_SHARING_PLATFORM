import "./App.css";
import SessionCreate from "./pages/SessionCreate";
import FileTransfer from "./pages/FileTransfer";
import P2PNetwork from "./pages/P2PNetwork";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"
          element={
            <>
              <SessionCreate />
              <P2PNetwork />
            </>
          }/>
          <Route path="/temp"
          element={
            <>
              <FileTransfer/>
              <P2PNetwork />
            </>}
          />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

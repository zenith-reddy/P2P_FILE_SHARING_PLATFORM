import "./App.css";
import SessionCreate from "./pages/SessionCreate";
import FileTransfer from "./pages/FileTransfer";
import P2PNetwork from "./pages/P2PNetwork";
import LoadingPage from "./pages/LoadingPage"; // Import the new page
import { BrowserRouter, Route, Routes } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      {/* P2PNetwork is outside Routes to ensure it remains 
         rendered as the persistent background across all pages 
      */}
      <P2PNetwork />
      
      <Routes>
        <Route
          path="/"
          element={<SessionCreate />}
        />
        <Route
          path="/transfer"
          element={<FileTransfer />}
        />
        <Route
          path="/:sessid"
          element={<LoadingPage />}
        />
        {/* <Route
          path="/sessid"
          element={<SessionCreate />}
        /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import { Amplify } from "aws-amplify";
import "./App.css";
//authenticator is react component that provide ready to use sign in & sign out UI
import { withAuthenticator } from "@aws-amplify/ui-react";
//import default style for Amplify UI components
import "@aws-amplify/ui-react/styles.css";
//AWS s3 storage imports
import { uploadData, list, getUrl, remove } from "aws-amplify/storage";
//AWS service configuration imports genrated by Amplify CLI
import awsExports from "./aws-exports";
import { useState, useEffect, useCallback } from "react";
// GraphQL imports
import { GraphQLAPI, graphqlOperation } from "@aws-amplify/api-graphql";
import { createUser } from "./graphql/mutations";
import { getUser } from "./graphql/queries";

// Configure Amplify library with setting of aws-exports.js file
Amplify.configure(awsExports);

function App({ signOut, user }) {
  const [fileData, setFileData] = useState([]);
  const [fileStatus, setFileStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalUsage, setTotalUsage] = useState(0);
  const [activeSection, setActiveSection] = useState("home");
  const [deletingKey, setDeletingKey] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, key: null, name: "" });

  const USER_QUOTA = 5 * 1024 * 1024 * 1024; // 5GB quota

  // Store user record in DynamoDB if not exists
  useEffect(() => {
    const storeUserRecord = async () => {
      try {
        // Check if user already exists
        const result = await GraphQLAPI.graphql(graphqlOperation(getUser, { id: user.attributes.sub }));
        if (!result.data.getUser) {
          await GraphQLAPI.graphql(graphqlOperation(createUser, {
            input: {
              id: user.attributes.sub,
              username: user.username,
              email: user.attributes.email,
              createdAt: new Date().toISOString()
            }
          }));
        }
      } catch (error) {
        // Ignore if already exists or error
      }
    };
    if (user && user.username && user.attributes && user.attributes.email) {
      storeUserRecord();
    }
  }, [user]);

  const fetchFiles = useCallback(async () => {
    try {
      const result = await list({ prefix: `${user.username}/`, pageSize: 100 });
      const filesWithMeta = await Promise.all(
        result.items.map(async (item) => {
          const { url } = await getUrl({ key: item.key });
          return {
            key: item.key,
            name: item.key.split("/").pop(),
            size: item.size,
            lastModified: item.lastModified,
            url,
            isImage: item.key.match(/\.(jpg|jpeg|png|gif)$/i),
          };
        })
      );
      setUploadedFiles(filesWithMeta);
      const usage = filesWithMeta.reduce((sum, file) => sum + (file.size || 0), 0);
      setTotalUsage(usage);
    } catch (error) {
      console.error("Failed to list files:", error);
    }
  }, [user.username]);

  const uploadFile = async () => {
    if (!fileData || fileData.length === 0) {
      setFileStatus("⚠️ Please choose file(s)");
      return;
    }
    setUploadProgress(0);
    setFileStatus("Uploading...");
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileData.length; i++) {
      const file = fileData[i];
      try {
        await uploadData({
          key: `${user.username}/${file.name}`,
          data: file,
          options: {
            contentType: file.type,
            progressCallback(progress) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(percent);
            },
          },
        }).result;
        successCount++;
      } catch (error) {
        console.error("Upload error:", error);
        failCount++;
      }
    }

    setFileStatus(
      `✅ Uploaded: ${successCount}, ❌ Failed: ${failCount}`
    );
    setFileData([]);
    setUploadProgress(0);
    await fetchFiles();
  };

  const handleDeleteClick = (key, name) => {
    setConfirmDelete({ show: true, key, name });
  };

  const confirmDeleteFile = async () => {
    setDeletingKey(confirmDelete.key);
    setConfirmDelete({ show: false, key: null, name: "" });
    try {
      await remove({ key: confirmDelete.key });
      setFileStatus(`🗑️ Deleted: ${confirmDelete.name} successfully!`);
      await fetchFiles();
    } catch (error) {
      setFileStatus("❌ Delete failed");
      console.error("Delete failed:", error);
    }
    setDeletingKey(null);
  };

  const cancelDelete = () => {
    setConfirmDelete({ show: false, key: null, name: "" });
  };

  const downloadFile = async (key) => {
    try {
      const { url } = await getUrl({ key });
      window.open(url, "_blank");
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const filteredFiles = uploadedFiles.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- NAVBAR ---
  const Navbar = () => (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => setActiveSection("home")}>
        <b style={{ color: "#1976d2" }}>AmplifyVault</b>
      </div>
      <div className="nav-links">
        <button
          className={`nav-btn${activeSection === "home" ? " active" : ""}`}
          onClick={() => setActiveSection("home")}
        >
          Home
        </button>
        <button
          className={`nav-btn${activeSection === "upload" ? " active" : ""}`}
          onClick={() => setActiveSection("upload")}
        >
          Upload File
        </button>
        <button
          className={`nav-btn${activeSection === "files" ? " active" : ""}`}
          onClick={() => setActiveSection("files")}
        >
          My Files
        </button>
        <button className="nav-btn" onClick={signOut}>
          Logout
        </button>
      </div>
      <div className="nav-user">
        <span>👤 {user.username}</span>
      </div>
    </nav>
  );

  // --- MAIN RENDER ---
  return (
    <div>
      <Navbar />
      <div className="app-container">
        <div className="card">
          {activeSection === "home" && (
            <>
              <h1>
                Hello, <span className="username">{user.username}</span> 👋
              </h1>
              <p>
                Welcome to <b style={{ color: "#1976d2" }}>AmplifyVault!!!</b>
              </p>
              <p>"Secure every byte, amplify your peace of mind."</p>
            </>
          )}

          {activeSection === "upload" && (
            <>
              <h2>Upload File(s)</h2>
              <div className="quota-bar">
                <div>
                  <strong>Storage Used:</strong> {formatSize(totalUsage)} / {formatSize(USER_QUOTA)}
                </div>
                <div className="quota-progress-bar">
                  <div
                    className="quota-progress"
                    style={{
                      width: `${Math.min((totalUsage / USER_QUOTA) * 100, 100)}%`,
                      background: totalUsage > USER_QUOTA * 0.9 ? "#e57373" : "#64b5f6",
                    }}
                  />
                </div>
              </div>
              <input
                type="file"
                multiple
                onChange={(e) => setFileData(Array.from(e.target.files))}
                className="file-input"
              />
              <button className="btn upload" onClick={uploadFile}>
                ⬆️ Upload File{fileData.length > 1 ? "s" : ""}
              </button>
              {fileData.length > 0 && (
                <div style={{ margin: "8px 0" }}>
                  <strong>Selected:</strong>
                  <ul>
                    {fileData.map((file, idx) => (
                      <li key={idx}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {uploadProgress > 0 && (
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              {/* Show status only if not a delete message */}
              {fileStatus && !fileStatus.startsWith("🗑️ Deleted:") && <p className="status">{fileStatus}</p>}
            </>
          )}

          {activeSection === "files" && (
            <>
              <h2>📁 Your Uploaded Files</h2>
              <input
                type="text"
                placeholder="🔍 Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <ul style={{ listStyle: "none", padding: 0 }}>
                {filteredFiles.map((file) => (
                  <li key={file.key} style={{ marginBottom: "1rem" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#f1f3f5",
                      borderRadius: "12px",
                      padding: "1rem",
                      boxShadow: "0 1px 4px rgba(26, 115, 232, 0.04)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        {file.isImage && (
                          <img src={file.url} alt={file.name} className="thumbnail" />
                        )}
                        <div style={{ textAlign: "left" }}>
                          <strong style={{ display: "block", fontSize: "1.08rem" }}>{file.name}</strong>
                          <span style={{ display: "inline-block", marginRight: "12px" }}>📏 {formatSize(file.size)}</span>
                          <span style={{ display: "inline-block" }}>🕒 {formatDate(file.lastModified)}</span>
                        </div>
                      </div>
                      <div className="actions">
                        <button className="btn download" onClick={() => downloadFile(file.key)}>⬇️ Download</button>
                        <button
                          className="btn delete"
                          onClick={() => handleDeleteClick(file.key, file.name)}
                          disabled={deletingKey === file.key}
                        >
                          {deletingKey === file.key ? "Deleting..." : "🗑️ Delete"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {filteredFiles.length === 0 && <p>No matching files found.</p>}
              {/* Show delete status message at the bottom */}
              {fileStatus && fileStatus.startsWith("🗑️ Deleted:") && (
                <p className="status" style={{ marginTop: "1.5rem" }}>{fileStatus}</p>
              )}

              {/* Confirmation Dialog */}
              {confirmDelete.show && (
                <div className="confirm-dialog">
                  <div className="confirm-content">
                    <p>Are you sure you want to delete <b>{confirmDelete.name}</b>?</p>
                    <button className="btn delete" onClick={confirmDeleteFile}>Yes, Delete</button>
                    <button className="btn" onClick={cancelDelete} style={{ background: "#e3eafc", color: "#1976d2" }}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuthenticator(App);

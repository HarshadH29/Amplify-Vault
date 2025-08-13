# AmplifyVault - Cloud Backup System

AmplifyVault is a cloud-based backup system built with **React**, **AWS Amplify**, and **Amazon S3**. It allows users to securely upload, manage, and restore files from anywhere, with authentication and quota management.

---

## Features

- **User Authentication** (AWS Cognito via Amplify)
- **File Upload** (Single & Multiple)
- **Drag-and-Drop Upload**
- **File Listing with Search**
- **Download & Delete Files**
- **Quota/Usage Display**
- **Confirmation Dialog for Delete**
- **Responsive UI**
- **Cloud Storage (Amazon S3)**
- **Secure Access (per-user folders)**

---

## Getting Started

### Prerequisites

- Node.js & npm
- AWS Account
- Amplify CLI (`npm install -g @aws-amplify/cli`)

---

### 1. Clone the Repository

```sh
git clone https://github.com/HarshadH29/Amplify-Vault.git
cd Amplify-Vault
```

---

### 2. Install Dependencies

```sh
npm install
```

---

### 3. Configure Amplify

```sh
amplify init
```
- Choose your AWS profile and region.

#### Add Authentication

```sh
amplify add auth
```
- Choose default configuration.

#### Add Storage (S3)

```sh
amplify add storage
```
- Content: "User files"
- Auth/Guest access: "Auth users only"
- Permissions: "create/update/read/delete"
- Prefix: "per-user"

#### Push Resources

```sh
amplify push
```

---

### 4. Run Locally

```sh
npm start
```
App runs at [http://localhost:3000](http://localhost:3000)

---

## Hosting

You can host the app using **AWS Amplify Hosting**:

1. Push your code to GitHub.
2. Go to AWS Amplify Console → Host web app.
3. Connect your repo and deploy.

---

## Usage

- **Sign Up / Login**: Register with your email.
- **Upload Files**: Drag-and-drop or select files to upload.
- **View Files**: See your uploaded files, search, download, or delete.
- **Quota**: See your storage usage bar.
- **Delete**: Confirm before deleting any file.

---

## Security

- Each user's files are stored in their own S3 folder.
- Only authenticated users can access their files.
- All operations use secure AWS Amplify APIs.

---

## Enhancements

- Email notifications (backup completion, quota warning)
- File versioning & restore
- Scheduled backups
- Sharing & collaboration
- Mobile app support

---

## License

MIT

---

## Support

For issues or feature requests, open a GitHub issue or contact the
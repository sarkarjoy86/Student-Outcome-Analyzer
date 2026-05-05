import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const {
    user,
    users,
    createUser,
    adminResetPassword,
    logout,
    actionLoading,
    message,
  } = useAuth();
  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [resetForm, setResetForm] = useState({
    email: "",
    newPassword: "",
  });

  const isCreateFormValid = () => {
    const fullName = newUserForm.fullName.trim();
    const rawEmail = newUserForm.email;
    const password = newUserForm.password.trim();
    
    // Simple normalization for validation check
    const email = rawEmail.trim().toLowerCase();
    
    return (
      fullName &&
      email &&
      password.length >= 6 &&
      email.includes("@") &&
      email.includes(".")
    );
  };

  const isResetFormValid = () => {
    return resetForm.email && resetForm.newPassword.trim();
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!isCreateFormValid()) {
      alert("Please fill all fields correctly. Password must be at least 6 characters.");
      return;
    }

    try {
      const { fullName, email, password } = newUserForm;
      await createUser({ 
        fullName: fullName.trim(), 
        email: email.trim(), 
        password: password.trim() 
      });
      setNewUserForm({ fullName: "", email: "", password: "" });
    } catch (error) {
      // Error is handled by AuthContext and displayed in the message area
      console.error("Failed to create user");
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!resetForm.email || !resetForm.newPassword.trim()) {
      alert("Please select a user and enter a new password.");
      return;
    }
    try {
      await adminResetPassword(resetForm);
      setResetForm({ email: "", newPassword: "" });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button
            onClick={logout}
            disabled={actionLoading}
            className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUserForm.fullName}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, fullName: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="text"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded"
                  placeholder="email@example.com"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded"
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={!isCreateFormValid() || actionLoading}
                className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Change User Password</h2>
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Select User
                </label>
                <select
                  value={resetForm.email}
                  onChange={(e) =>
                    setResetForm({ ...resetForm, email: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value="">Select a user</option>
                  {users
                    .filter((u) => u.role !== "admin")
                    .map((u) => (
                      <option key={u.email} value={u.email}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={resetForm.newPassword}
                  onChange={(e) =>
                    setResetForm({ ...resetForm, newPassword: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded"
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={!isResetFormValid() || actionLoading}
                className="w-full bg-green-500 text-white py-2 rounded disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Users List</h2>
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Full Name</th>
                <th className="text-left py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="2" className="text-center py-4">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.email} className="border-b">
                    <td className="py-2">{u.fullName}</td>
                    <td className="py-2">{u.email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {message.text && (
          <div
            className={`mt-4 p-4 rounded ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

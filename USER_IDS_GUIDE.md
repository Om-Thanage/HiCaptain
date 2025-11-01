# 👥 User IDs in HiCaptain Projects

## 🔍 **What are Client & Developer IDs?**

In HiCaptain, when you create a project, you need to assign:
- **Client ID**: The user who owns/requested the project (someone with "Client" role)
- **Developer IDs**: The team members who will work on the project (users with "Developer" role)

## 📋 **How to Find User IDs**

### Method 1: **Users Page (Admin Only)**
1. Go to **Users** page in the sidebar
2. You'll see all users with their:
   - Name
   - Role (Admin, Client, Developer, ProjectManager)
   - **User ID** (displayed as "ID: xyz123")

### Method 2: **Project Creation Form (Enhanced)**
The new project creation form now shows:
- **Dropdown list of all clients** - select easily by name
- **Checkbox list of all developers** - select multiple team members
- **User avatars and names** - visual identification
- **Automatic ID display** - see the ID next to each name

## 🏗️ **How User IDs are Generated**

User IDs are automatically created when someone registers:

### **Registration Process:**
1. User visits `/register` page
2. Fills out registration form:
   - Name
   - Username  
   - Password
   - Role (Client, Developer, ProjectManager, Admin)
3. Backend creates user account with **unique ID**
4. ID is available immediately for project assignments

### **ID Format:**
- Usually alphanumeric strings like: `user123`, `dev456`, `client789`
- Generated automatically by your backend system
- Unique across all users

## 👨‍💼 **User Roles Explained**

| Role | Description | Can be assigned as |
|------|-------------|-------------------|
| **Client** | Project owners, stakeholders | ✅ Project Client |
| **Developer** | Code writers, implementers | ✅ Project Developer |
| **ProjectManager** | Project supervisors | ❌ Not assignable in current form |
| **Admin** | System administrators | ❌ Not assignable in current form |

## 🚀 **Quick Setup Guide**

### **To create your first project, you need:**

1. **At least 1 Client user registered:**
   ```
   Name: John Smith
   Role: Client
   → Gets ID: client_001 (example)
   ```

2. **At least 1 Developer user registered:**
   ```
   Name: Jane Doe
   Role: Developer  
   → Gets ID: dev_001 (example)
   ```

3. **Then in project creation:**
   - Select "John Smith" from Client dropdown
   - Check "Jane Doe" in Developer list
   - IDs are automatically used behind the scenes

## 📝 **Example Workflow**

### **Step 1: Register Users**
Go to `/register` and create:
- **Client**: "ABC Company" (gets ID: `client_abc_001`)
- **Developer**: "Alice Cooper" (gets ID: `dev_alice_001`) 
- **Developer**: "Bob Wilson" (gets ID: `dev_bob_001`)

### **Step 2: Create Project**
Go to `/projects/new`:
- **Project Name**: "E-commerce Website"
- **Client**: Select "ABC Company" from dropdown
- **Developers**: Check ✅ Alice Cooper and ✅ Bob Wilson
- **Submit** → Project created with proper ID assignments

## 🔧 **Admin Tools**

### **View All Users & IDs:**
- Admin users can visit `/users` page
- See complete list with roles and IDs
- Manage user accounts
- Track assignments

### **User Management:**
- Edit user roles
- View user statistics  
- See task assignments per user
- Monitor project participation

## ❓ **Common Questions**

**Q: I don't see any clients/developers in the dropdown**
**A:** Users need to register first with the appropriate roles

**Q: Can I change a user's ID after registration?**
**A:** No, IDs are permanent. Contact admin if needed.

**Q: What if I assign wrong IDs?**
**A:** Edit the project later to reassign team members

**Q: Can one user have multiple roles?**
**A:** Currently no, each user has one role (Client OR Developer)

## 🎯 **Next Steps**

1. **Register test users** with different roles
2. **Create your first project** using the enhanced form  
3. **Verify assignments** in project detail page
4. **Start managing tasks** and assign them to developers

The enhanced project creation form makes it much easier to see and select the right team members without memorizing IDs!
import Navbar from "../components/Navbar";

function DashboardLayout({ children }) {
    const user = JSON.parse(localStorage.getItem("user"));

    return (
        <>
            <Navbar role={user?.role} />

            <div style={{
                padding: "40px",
                maxWidth: "1000px",
                margin: "0 auto"
            }}>
                {children}
            </div>
        </>
    );
}

export default DashboardLayout;

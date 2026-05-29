import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function HighCourts() {

  const [courts, setCourts] = useState([]);

  useEffect(() => {

    axios
      .get("http://localhost:5000/api/courts")
      .then((res) => setCourts(res.data))
      .catch((err) => console.log(err));

  }, []);

  if (!courts.length) return <h1>Loading...</h1>;

  return (
    <div style={{ padding: 20 }}>
      <h1>All High Courts</h1>

      <div className="court-grid" style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 20 }}>

        {courts.map((court) => (

          <Link
            to={`/highcourt/${court.slug}`}
            key={court._id}
            className="court-card"
            style={{
              display: "block",
              width: 260,
              padding: 16,
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              textDecoration: "none",
              color: "#111"
            }}
          >

            <h3 style={{ margin: 0 }}>{court.name}</h3>

          </Link>

        ))}

      </div>

    </div>
  );

}

export default HighCourts;

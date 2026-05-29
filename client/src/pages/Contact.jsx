import { motion } from "framer-motion";
import { Globe, Link2, Mail, MapPin, Phone, Send } from "lucide-react";
import Navbar from "../components/Navbar";
import "../styles/contact.css";

function Contact() {
  return (
    <>
      <Navbar />
      <main className="contact-page">
        <section className="contact-hero">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="contact-eyebrow">Contact</p>
            <h1>Contact Lawyers Times</h1>
            <p>Get in touch with our legal editorial team.</p>
          </motion.div>
        </section>

        <section className="contact-layout">
          <motion.form className="contact-form-card" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.45 }}>
            <label>
              Name
              <input type="text" placeholder="Enter name" />
            </label>
            <label>
              Email
              <input type="email" placeholder="Enter email" />
            </label>
            <label>
              Subject
              <input type="text" placeholder="Enter subject" />
            </label>
            <label>
              Message
              <textarea rows={6} placeholder="Write your message" />
            </label>
            <button type="submit">
              <Send size={17} />
              Send Message
            </button>
          </motion.form>

          <motion.aside className="contact-info-stack" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.45 }}>
            <div className="contact-info-card">
              <MapPin size={22} />
              <div>
                <strong>Location</strong>
                <span>New Delhi, India</span>
              </div>
            </div>
            <div className="contact-info-card">
              <Mail size={22} />
              <div>
                <strong>Email</strong>
                <span>editorial@lawyerstimes.com</span>
              </div>
            </div>
            <div className="contact-info-card">
              <Phone size={22} />
              <div>
                <strong>Phone</strong>
                <span>+91 98765 43210</span>
              </div>
            </div>
            <div className="contact-social-card">
              <strong>Follow Lawyers Times</strong>
              <div>
                <a href="#" aria-label="Website"><Globe size={20} /></a>
                <a href="#" aria-label="Social link"><Link2 size={20} /></a>
                <a href="#" aria-label="Email"><Mail size={20} /></a>
              </div>
            </div>
          </motion.aside>
        </section>

        <motion.section className="contact-map-placeholder" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <MapPin size={32} />
          <strong>Google Map Placeholder</strong>
          <p>Editorial office location map will appear here.</p>
        </motion.section>
      </main>
    </>
  );
}

export default Contact;

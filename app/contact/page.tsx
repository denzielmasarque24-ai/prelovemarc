import type { Metadata } from 'next';
import './contact.css';

export const metadata: Metadata = {
  title: 'PRELOVE SHOP - Contact Us',
  description: 'Get in touch with PRELOVE SHOP.',
};

const contactItems = [
  { icon: 'Email', label: 'Email', value: 'prelove.shop@gmail.com' },
  { icon: 'Phone', label: 'Phone', value: '09xx xxx xxxx' },
  { icon: 'Location', label: 'Location', value: 'Online Shop' },
  { icon: 'Instagram', label: 'Instagram', value: '@prelove.shop' },
  { icon: 'Facebook', label: 'Facebook', value: 'prelove shop' },
];

export default function ContactPage() {
  return (
    <main className="contact-main">
      <p className="sr-only">Contact Page Working</p>

      <div className="contact-container">
        <h1 className="contact-title">CONTACT US</h1>

        <div className="contact-content">
          <p className="contact-intro">Feel free to message us anytime.</p>

          <div className="contact-info">
            {contactItems.map((item) => (
              <div key={item.label} className="info-item">
                <span className="info-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="info-text">
                  <p className="info-label">{item.label}</p>
                  <p className="info-value">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

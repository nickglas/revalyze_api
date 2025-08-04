import nodemailer from "nodemailer";
import { Service } from "typedi";

@Service()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendResetPasswordEmail(to: string, resetToken: string) {
    const resetUrl = `http://localhost:4001/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: `Revalyze Support`,
      to,
      subject: "Password Reset Request",
      html: `
       <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Reset Your Password</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <!--[if !mso]><!-->
          <style type="text/css">
            @media only screen and (max-width: 600px) {
              .inner-table {
                width: 100% !important;
              }
              .footer-column {
                display: block !important;
                width: 100% !important;
                padding: 10px 0 !important;
              }
            }
          </style>
          <!--<![endif]-->
        </head>
        <body style="margin:0;padding:0;background-color:#000;font-family:Arial,sans-serif;">
          <!--[if gte mso 9]>
          <center>
          <table width="600" align="center" cellpadding="0" cellspacing="0" style="background-color:#000;">
          <tr>
          <td>
          <![endif]-->

          <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000">
            <tr>
              <td align="center">
                <table class="inner-table" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;color:#ffffff;background-color:#000;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding:20px 0;">
                      <!-- Replaced SVG with PNG image -->
                      <img src="http://188.245.185.40/logo.jpeg" alt="Company Logo" width="150" style="display:block;">
                    </td>
                  </tr>

                  <!-- Gradient Bar - Replaced with solid color -->
                  <tr>
                    <td height="4" bgcolor="#5b5afe"></td>
                  </tr>

                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding:30px 20px 10px;">
                      <h1 style="margin:0;font-size:24px;font-weight:700;">Forgot your password?</h1>
                      <p style="color:#5350bd;margin:8px 0;font-weight:700;">
                        No worries, it happens to the best of us
                      </p>
                    </td>
                  </tr>

                  <!-- Message -->
                  <tr>
                    <td align="center" style="padding:20px 30px;color:#cccccc;font-size:15px;">
                      You're receiving this email because a password reset was
                      requested for your Revalyze account.
                    </td>
                  </tr>

                  <!-- CTA Button with Outlook VML fallback -->
                  <tr>
                    <td align="center" style="padding:20px;">
                      <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                          href="${resetUrl}"
                          style="height:44px;width:200px;v-text-anchor:middle;"
                          arcsize="50%"
                          strokecolor="#5b5afe"
                          fillcolor="#5b5afe">
                          <v:textbox style="mso-fit-shape-to-text:t;"
                            inset="0px,0px,0px,0px">
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">
                              Reset my password
                            </center>
                          </v:textbox>
                        </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                        <a href="${resetUrl}"
                          style="background-color:#5b5afe;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:30px;font-size:16px;display:inline-block;font-weight:bold;border:1px solid #5b5afe;">
                          Reset my password
                        </a>
                      <!--<![endif]-->
                    </td>
                  </tr>

                  <!-- Expiration Note -->
                  <tr>
                    <td align="center" style="font-size:12px;color:#888888;padding-bottom:20px;">
                      Link expires in 30 minutes, for your safety.
                    </td>
                  </tr>

                  <!-- Info if not requested -->
                  <tr>
                    <td style="padding:20px 30px;color:#cccccc;font-size:14px;">
                      <strong style="color:#ffffff;">Didn't request this change?</strong>
                      <p style="margin:8px 0 0;">
                        Just ignore this message, your password is still safe and your
                        account remains secure.
                      </p>
                    </td>
                  </tr>

                  <!-- Help -->
                  <tr>
                    <td style="padding:0 30px 40px;color:#cccccc;font-size:14px;">
                      <strong style="color:#5350bd;">Need help?</strong>
                      <p style="margin:8px 0 0;">
                        Don't panic, just reach out to us. We've got humans (and AI)
                        standing by to assist you.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer Links -->
                  <tr>
                    <td align="center" style="padding:30px 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;text-align:left;">
                        <tr>
                          <td class="footer-column" width="33%" valign="top" style="vertical-align:top;padding:0 10px;">
                            <strong>PRODUCT</strong>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">Weebly Themes</a>
                            </p>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">Pre-sale FAQs</a>
                            </p>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">Submit a Ticket</a>
                            </p>
                          </td>
                          <td class="footer-column" width="33%" valign="top" style="vertical-align:top;padding:0 10px;">
                            <strong>RESOURCES</strong>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">Showcase</a>
                            </p>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">WidgetKit</a>
                            </p>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">Support</a>
                            </p>
                          </td>
                          <td class="footer-column" width="33%" valign="top" style="vertical-align:top;padding:0 10px;">
                            <strong>COMPANY</strong>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">About Us</a>
                            </p>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">Contact</a>
                            </p>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">Affiliates</a>
                            </p>
                            <p style="margin:8px 0;">
                              <a href="#" style="color:#ffffff;text-decoration:none;">Resources</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="border-top:1px solid #333333;"></td>
                  </tr>

                  <!-- Social + Copyright -->
                  <tr>
                    <td align="center" style="padding:20px;">
                      <p style="margin-bottom:15px;">
                        <a href="#" style="margin:0 5px;display:inline-block;">
                          <img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" alt="Facebook" width="24" height="24" style="display:block;border:0;">
                        </a>
                        <a href="#" style="margin:0 5px;display:inline-block;">
                          <img src="https://cdn-icons-png.flaticon.com/24/733/733579.png" alt="Twitter" width="24" height="24" style="display:block;border:0;">
                        </a>
                        <a href="#" style="margin:0 5px;display:inline-block;">
                          <img src="https://cdn-icons-png.flaticon.com/24/733/733558.png" alt="RSS" width="24" height="24" style="display:block;border:0;">
                        </a>
                        <a href="#" style="margin:0 5px;display:inline-block;">
                          <img src="https://cdn-icons-png.flaticon.com/24/733/733590.png" alt="Flickr" width="24" height="24" style="display:block;border:0;">
                        </a>
                      </p>
                      <p style="color:#777777;font-size:11px;">
                        &copy; 2025 Revalyze. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!--[if gte mso 9]>
          </td>
          </tr>
          </table>
          </center>
          <![endif]-->
        </body>
        </html>`,
    });
  }
}

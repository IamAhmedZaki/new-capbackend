
const nodemailer = require('nodemailer');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // use TLS later
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // must be an App Password
    },
  });
};



const generateWorkFlowChangeEmail = (orderItem, customer, order, currentStage) => {
  const orderItemUrl = `https://elipsestudio.com/CustomerChecker/customercheckpage.html`;

  return {
    subject: `Workflow Update for Your Order Item`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Workflow Stage Changed</h2>
        <p>Dear ${customer.firstName} ${customer.lastName},</p>
        <p>The workflow stage for one of your items in order <strong>${order.orderNumber}</strong> has been updated.</p>
        <ul>
          <li><strong>Product:</strong> ${orderItem.product?.title || "N/A"}</li>
          <li><strong>Color:</strong> ${orderItem.color || "N/A"}</li>
          <li><strong>New Stage:</strong> ${currentStage || "N/A"}</li>
          
        </ul>
        <p>You can use this token to view the order details:</p>
        <p style="font-weight: bold; font-size: 16px; color: #007cba;">${order.token}</p>
        <p>Click the link below to view your order and track the progress:</p>
        <a href="${orderItemUrl}" style="display:inline-block;padding:10px 20px;background:#007cba;color:#fff;text-decoration:none;border-radius:5px;">View Order</a>
        <p>If you have any questions, feel free to contact us.</p>
        <p>Best regards,<br>Your Company Team</p>
      </div>
    `,
    text: `Workflow Stage Changed - Order ${order.orderNumber}

Dear ${customer.firstName} ${customer.lastName},

The workflow stage for one of your items in order ${order.orderNumber} has been updated.

Product: ${orderItem.product?.name || "N/A"}
Color: ${orderItem.color || "N/A"}
Quantity: ${orderItem.quantity}
New Stage: ${orderItem.currentStage || "N/A"}
Updated At: ${new Date().toLocaleString()}
Updated By: ${orderItem.updatedBy || "Our Team"}

You can use this token to view the details: ${order.token}

View your order here: ${orderItemUrl}

Best regards,
Your Company Team`
  };
};



const workflowStatusChange = async (req, res) => {

  try {
    const { id } = req.params;
    const {

      currentStage,

      updatedBy,
      // Optional: new list of sizes to replace
    } = req.body;

    const existingOrderItem = await prisma.orderItem.findUnique({
      where: { id: parseInt(id) },
      include: {
        order: {
          include: {
            customer: true
          }
        },
        product: true
      },
    });

    if (!existingOrderItem) {
      return res.status(404).json({ message: 'OrderItem not found' });
    }

    // Update main order item fields
    const updatedOrderItem = await prisma.orderItem.update({
      where: { id: parseInt(id) },
      data: {

        currentStage,

        updatedBy,
      },
    });

    const transporter = createEmailTransporter();
    const emailContent = generateWorkFlowChangeEmail(existingOrderItem, existingOrderItem.order.customer, existingOrderItem.order, currentStage);

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: existingOrderItem.order.customer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const resultDeEmail = await transporter.sendMail(mailOptions);

    const result = await prisma.orderItem.findUnique({
      where: { id: parseInt(id) },

    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Update OrderItem Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }


}


const capOrderEmail = (orderData) => {
  const {
    customerDetails,
    selectedOptions,
    totalPrice,
    currency,
    orderNumber,
    orderDate
  } = orderData;

  // Format the order details for email
  const formatOptions = (options) => {
    return Object.entries(options)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return Object.entries(value)
            .map(([subKey, subValue]) => {
              if (subValue && subValue !== '' && subValue !== null) {
                return `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #eee;">${formatLabel(subKey)}:</td><td style="padding: 4px 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formatValue(subValue)}</td></tr>`;
              }
              return '';
            })
            .join('');
        }
        if (value && value !== '' && value !== null) {
          return `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #eee;">${formatLabel(key)}:</td><td style="padding: 4px 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formatValue(value)}</td></tr>`;
        }
        return '';
      })
      .join('');
  };

  const formatLabel = (label) => {
    const labelMap = {
      'firstName': 'Fornavn',
      'lastName': 'Efternavn',
      'email': 'E-mail',
      'phone': 'Telefon',
      'Skolenavn': 'Skolenavn',
      'address': 'Adresse',
      'city': 'By',
      'postalCode': 'Postnummer',
      'country': 'Land',
      'notes': 'Bemærkninger',
      'deliverToSchool': 'Leveres til skole',
      'KOKARDE': 'Kokarde',
      'Roset farve': 'Roset farve',
      'Kokarde': 'Kokarde',
      'Emblem': 'Emblem',
      'Type': 'Type',
      'TILBEHØR': 'Tilbehør',
      'Hueæske': 'Hueæske',
      'Premium æske': 'Premium æske',
      'Huekuglepen': 'Huekuglepen',
      'Silkepude': 'Silkepude',
      'Ekstra korkarde': 'Ekstra korkarde',
      'Ekstra korkarde Text': 'Ekstra korkarde tekst',
      'Handsker': 'Handsker',
      'Stor kuglepen': 'Stor kuglepen',
      'Smart Tag': 'Smart Tag',
      'Lyskugle': 'Lyskugle',
      'Luksus champagneglas': 'Luksus champagneglas',
      'Fløjte': 'Fløjte',
      'Trrompet': 'Trompet',
      'Bucketpins': 'Bucketpins',
      'STØRRELSE': 'Størrelse',
      'Vælg størrelse': 'Vælg størrelse',
      'Millimeter tilpasningssæt': 'Millimeter tilpasningssæt'
    };
    return labelMap[label] || label.replace(/([A-Z])/g, ' $1').trim();
  };

  const formatValue = (value) => {
    if (typeof value === 'object') {
      return value.name || value.value || JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nej';
    }
    if (value === '') {
      return 'Ikke angivet';
    }
    if (value === 'No') return 'Nej';
    if (value === 'Yes') return 'Ja';
    if (value === 'Standard') return 'Standard';
    if (value === 'NONE') return 'Ingen';
    return value;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
        .section { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
        .total { background: #d1fae5; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎩 Din Tilpassede Hue Ordre</h1>
          <p>Ordrenummer: ${orderNumber}</p>
        </div>
        
        <div class="content">
          <div class="section">
            <h2>Kundeinformation</h2>
            <p><strong>Navn:</strong> ${customerDetails.firstName} ${customerDetails.lastName}</p>
            <p><strong>E-mail:</strong> ${customerDetails.email}</p>
            <p><strong>Telefon:</strong> ${customerDetails.phone}</p>
            ${customerDetails.Skolenavn ? `<p><strong>Skolenavn:</strong> ${customerDetails.Skolenavn}</p>` : ''}
            <p><strong>Adresse:</strong> ${customerDetails.address}, ${customerDetails.city}, ${customerDetails.postalCode}, ${customerDetails.country}</p>
            ${customerDetails.notes ? `<p><strong>Bemærkninger:</strong> ${customerDetails.notes}</p>` : ''}
            ${customerDetails.deliverToSchool ? `<p><strong>Leveres til skole:</strong> Ja</p>` : ''}
          </div>

          <div class="section">
            <h2>Hue Konfiguration</h2>
            ${Object.entries(selectedOptions)
      .map(([category, options]) => {
        const hasOptions = Object.values(options).some(val => val && val !== '' && val !== null);
        if (!hasOptions) return '';

        return `
                  <h3>${formatLabel(category)}</h3>
                  <table>
                    ${formatOptions(options)}
                  </table>
                `;
      })
      .join('')}
          </div>

          <div class="total">
            <h2>Total Beløb</h2>
            <p style="font-size: 24px; margin: 0;">${totalPrice} ${currency}</p>
          </div>

          <div class="section">
            <p><strong>Ordredato:</strong> ${new Date(orderDate).toLocaleDateString('da-DK')}</p>
            <p>Tak for din ordre! Vi behandler den snarest og kontakter dig, hvis vi har brug for yderligere oplysninger.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    TILPASSET HUE ORDRE BEKRÆFTELSE
    ================================

    Ordrenummer: ${orderNumber}
    Ordredato: ${new Date(orderDate).toLocaleDateString('da-DK')}

    KUNDEINFORMATION:
    -----------------
    Navn: ${customerDetails.firstName} ${customerDetails.lastName}
    E-mail: ${customerDetails.email}
    Telefon: ${customerDetails.phone}
    ${customerDetails.Skolenavn ? `Skolenavn: ${customerDetails.Skolenavn}` : ''}
    Adresse: ${customerDetails.address}, ${customerDetails.city}, ${customerDetails.postalCode}, ${customerDetails.country}
    ${customerDetails.notes ? `Bemærkninger: ${customerDetails.notes}` : ''}
    ${customerDetails.deliverToSchool ? `Leveres til skole: Ja` : ''}

    HUE KONFIGURATION:
    ------------------
    ${Object.entries(selectedOptions)
      .map(([category, options]) => {
        const hasOptions = Object.values(options).some(val => val && val !== '' && val !== null);
        if (!hasOptions) return '';

        return `
        ${formatLabel(category).toUpperCase()}:
        ${Object.entries(options)
            .map(([key, value]) => {
              if (value && value !== '' && value !== null) {
                if (typeof value === 'object') {
                  return Object.entries(value)
                    .map(([subKey, subValue]) => {
                      if (subValue && subValue !== '' && subValue !== null) {
                        return `  ${formatLabel(subKey)}: ${formatValue(subValue)}`;
                      }
                      return '';
                    })
                    .join('\n');
                }
                return `  ${formatLabel(key)}: ${formatValue(value)}`;
              }
              return '';
            })
            .join('\n')}
        `;
      })
      .join('\n')}

    TOTAL BELØB:
    ------------
    ${totalPrice} ${currency}

    Tak for din ordre! Vi behandler den snarest.
  `;

  return {
    subject: `🎩 Hue Ordre Bekræftelse - ${orderNumber}`,
    html,
    text
  };
};

const capOrderAdminEmail = (orderData) => {
  const {
    customerDetails,
    selectedOptions,
    totalPrice,
    currency,
    orderNumber,
    orderDate,
    email // Customer email
  } = orderData;

  // Format the order details for email
  const formatOptions = (options) => {
    return Object.entries(options)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return Object.entries(value)
            .map(([subKey, subValue]) => {
              if (subValue && subValue !== '' && subValue !== null) {
                return `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #eee;">${formatLabel(subKey)}:</td><td style="padding: 4px 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formatValue(subValue)}</td></tr>`;
              }
              return '';
            })
            .join('');
        }
        if (value && value !== '' && value !== null) {
          return `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #eee;">${formatLabel(key)}:</td><td style="padding: 4px 8px; border-bottom: 1px solid #eee; font-weight: bold;">${formatValue(value)}</td></tr>`;
        }
        return '';
      })
      .join('');
  };

  const formatLabel = (label) => {
    const labelMap = {
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'email': 'Email',
      'phone': 'Phone',
      'Skolenavn': 'School Name',
      'address': 'Address',
      'city': 'City',
      'postalCode': 'Postal Code',
      'country': 'Country',
      'notes': 'Notes',
      'deliverToSchool': 'Deliver to School',
      'KOKARDE': 'Cockade',
      'Roset farve': 'Rosette Color',
      'Kokarde': 'Cockade',
      'Emblem': 'Emblem',
      'Type': 'Type',
      'TILBEHØR': 'Accessories',
      'Hueæske': 'Cap Box',
      'Premium æske': 'Premium Box',
      'Huekuglepen': 'Cap Ballpoint Pen',
      'Silkepude': 'Silk Pillow',
      'Ekstra korkarde': 'Extra Cockade',
      'Ekstra korkarde Text': 'Extra Cockade Text',
      'Handsker': 'Gloves',
      'Stor kuglepen': 'Large Ballpoint Pen',
      'Smart Tag': 'Smart Tag',
      'Lyskugle': 'Light Ball',
      'Luksus champagneglas': 'Luxury Champagne Glass',
      'Fløjte': 'Whistle',
      'Trrompet': 'Trumpet',
      'Bucketpins': 'Bucket Pins',
      'STØRRELSE': 'Size',
      'Vælg størrelse': 'Select Size',
      'Millimeter tilpasningssæt': 'Millimeter Adjustment Set'
    };
    return labelMap[label] || label.replace(/([A-Z])/g, ' $1').trim();
  };

  const formatValue = (value) => {
    if (typeof value === 'object') {
      return value.name || value.value || JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value === '') {
      return 'Not specified';
    }
    if (value === 'No') return 'No';
    if (value === 'Yes') return 'Yes';
    if (value === 'Standard') return 'Standard';
    if (value === 'NONE') return 'None';
    return value;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
        .section { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
        .total { background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        .alert { background: #fef3c7; padding: 10px; border-radius: 5px; border-left: 4px solid #f59e0b; margin-bottom: 15px; }
        .priority { background: #fee2e2; padding: 10px; border-radius: 5px; border-left: 4px solid #ef4444; margin-bottom: 15px; }
        .payment-pending {
  background: #fff3cd;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid #ffc107;
  margin-bottom: 15px;
  color: #856404;
}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎩 NEW GRADUATION CAP ORDER RECEIVED</h1>
          <p>Order Number: ${orderNumber} | ${new Date(orderDate).toLocaleDateString('en-US')}</p>
        </div>
        
        <div class="content">
          <div class="priority">
            <strong>🚨 ACTION REQUIRED:</strong> New order received and needs to be processed.
          </div>
         <div class="warning payment-pending">
           <strong>⏳ PAYMENT PENDING:</strong> Order has been received but payment is pending.
          </div>
          
          <div class="alert">
            <strong>📧 Customer Email:</strong> ${customerDetails.email}
          </div>

          <div class="section">
            <h2>👤 Customer Information</h2>
            <p><strong>Name:</strong> ${customerDetails.firstName} ${customerDetails.lastName}</p>
            <p><strong>Email:</strong> ${customerDetails.email}</p>
            <p><strong>Phone:</strong> ${customerDetails.phone}</p>
            ${customerDetails.Skolenavn ? `<p><strong>School Name:</strong> ${customerDetails.Skolenavn}</p>` : ''}
            <p><strong>Address:</strong> ${customerDetails.address}, ${customerDetails.city}, ${customerDetails.postalCode}, ${customerDetails.country}</p>
            ${customerDetails.notes ? `<p><strong>Customer Notes:</strong> ${customerDetails.notes}</p>` : ''}
            ${customerDetails.deliverToSchool ? `<p><strong>Deliver to School:</strong> Yes</p>` : ''}
          </div>

          <div class="section">
            <h2>⚙️ Cap Configuration</h2>
            ${Object.entries(selectedOptions)
      .map(([category, options]) => {
        const hasOptions = Object.values(options).some(val => val && val !== '' && val !== null);
        if (!hasOptions) return '';

        return `
                  <h3>${formatLabel(category)}</h3>
                  <table>
                    ${formatOptions(options)}
                  </table>
                `;
      })
      .join('')}
          </div>

          <div class="total">
            <h2>💰 Total Amount</h2>
            <p style="font-size: 24px; margin: 0;">${totalPrice} ${currency}</p>
          </div>

          <div class="section">
            <p><strong>📅 Order Date:</strong> ${new Date(orderDate).toLocaleString('en-US')}</p>
            <p><strong>🔢 Order Number:</strong> ${orderNumber}</p>
            <p><strong>📧 Customer Contact:</strong> ${customerDetails.email}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    NEW GRADUATION CAP ORDER NOTIFICATION - ACTION REQUIRED
    ======================================================

    Order Number: ${orderNumber}
    Order Date: ${new Date(orderDate).toLocaleString('en-US')}
    Customer Email: ${email}

    🚨 ACTION REQUIRED: New order received and needs to be processed.

    CUSTOMER INFORMATION:
    ---------------------
    Name: ${customerDetails.firstName} ${customerDetails.lastName}
    Email: ${customerDetails.email}
    Phone: ${customerDetails.phone}
    ${customerDetails.Skolenavn ? `School Name: ${customerDetails.Skolenavn}` : ''}
    Address: ${customerDetails.address}, ${customerDetails.city}, ${customerDetails.postalCode}, ${customerDetails.country}
    ${customerDetails.notes ? `Customer Notes: ${customerDetails.notes}` : ''}
    ${customerDetails.deliverToSchool ? `Deliver to School: Yes` : ''}

    CAP CONFIGURATION:
    ------------------
    ${Object.entries(selectedOptions)
      .map(([category, options]) => {
        const hasOptions = Object.values(options).some(val => val && val !== '' && val !== null);
        if (!hasOptions) return '';

        return `
        ${formatLabel(category).toUpperCase()}:
        ${Object.entries(options)
            .map(([key, value]) => {
              if (value && value !== '' && value !== null) {
                if (typeof value === 'object') {
                  return Object.entries(value)
                    .map(([subKey, subValue]) => {
                      if (subValue && subValue !== '' && subValue !== null) {
                        return `  ${formatLabel(subKey)}: ${formatValue(subValue)}`;
                      }
                      return '';
                    })
                    .join('\n');
                }
                return `  ${formatLabel(key)}: ${formatValue(value)}`;
              }
              return '';
            })
            .join('\n')}
        `;
      })
      .join('\n')}

    TOTAL AMOUNT:
    -------------
    ${totalPrice} ${currency}

    ACTION REQUIRED: Please process this order as soon as possible.
    Customer Contact: ${customerDetails.email}
  `;

  return {
    subject: `🎩 NEW ORDER: Graduation Cap Order : ${orderNumber} - ${customerDetails.firstName} ${customerDetails.lastName}`,
    html,
    text
  };
};

const sendCapEmail = async (req, res) => {
  try {
    const {
      customerDetails,
      selectedOptions,
      totalPrice,
      currency,
      orderNumber,
      orderDate,
      email
    } = req.body;

    // Validate required fields
    if (!customerDetails || !selectedOptions || !email) {
      return res.status(400).json({
        message: 'Missing required fields: customerDetails, selectedOptions, and email are required'
      });
    }

    const transporter = createEmailTransporter();
    const emailContent = capOrderEmail({
      customerDetails,
      selectedOptions,
      totalPrice: totalPrice || '299.00',
      currency: currency || 'DKK',
      orderNumber: orderNumber || `CAP-${Date.now()}`,
      orderDate: orderDate || new Date().toISOString()
    });
    const emailContentAdmin = capOrderAdminEmail({
      customerDetails,
      selectedOptions,
      totalPrice: totalPrice || '299.00',
      currency: currency || 'DKK',
      orderNumber: orderNumber || `CAP-${Date.now()}`,
      orderDate: orderDate || new Date().toISOString()
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const mailOptionsAdmin = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: "yousaf_farooq@hotmail.com",
      subject: emailContentAdmin.subject,
      html: emailContentAdmin.html,
      text: emailContentAdmin.text
    };
    // Send email
    const emailResult = await transporter.sendMail(mailOptions);
    const emailResultAdmin = await transporter.sendMail(mailOptionsAdmin);

    // Optionally save to database using Prisma
    try {
      const orderData = {
        customerDetails,
        selectedOptions,
        totalPrice: parseFloat(totalPrice) || 299.00,
        currency: currency || 'DKK',
        orderNumber: orderNumber || `CAP-${Date.now()}`,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        customerEmail: email,
        status: 'PENDING'
      };

      const result = await prisma.order.create({
        data: orderData
      });

      res.status(200).json({
        message: 'Order created and email sent successfully',
        orderId: result.id,
        orderNumber: result.orderNumber,
        emailResult: {
          messageId: emailResult.messageId,
          accepted: emailResult.accepted
        }
      });
    } catch (dbError) {
      console.error('Database Error:', dbError);
      // Still return success for email even if DB fails
      res.status(200).json({
        message: 'Email sent successfully but database save failed',
        emailResult: {
          messageId: emailResult.messageId,
          accepted: emailResult.accepted
        },
        warning: 'Order not saved to database'
      });
    }

  } catch (error) {
    console.error('Send Cap Email Error:', error);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

const stripePayment = async (req, res) => {
  const { orderNumber, totalPrice, email } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "dkk",
            product_data: {
              name: `Cap Order : ${orderNumber}`,
            },
            unit_amount: totalPrice * 100, // Stripe expects øre (cents)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://elipsestudio.com/studentlife/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://elipsestudio.com/studentlife/cancel",
    });

    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

}

const getSessionDetails = async (req, res) => {
  const { session_id } = req.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items"],
    });

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



module.exports = {
  workflowStatusChange, sendCapEmail, stripePayment, getSessionDetails
};

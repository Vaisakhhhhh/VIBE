// ==========================
// Admin Sales Report Controller
// ==========================

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');



const orderModel = require('../../models/orderSchema');


exports.getSalesReport = async (req, res) => {
    try {
        const { filter, start_date, end_date } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        let dateQuery = {
            'payment.paymentStatus': 'Completed',
            'items.status': 'Delivered'
        };

        switch (filter) {
            case 'daily': {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateQuery = {
                    ...dateQuery,
                    createdAt: { $gte: today }
                };
                break;
            }
            case 'weekly': {
                const today = new Date();
                const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
                weekStart.setHours(0, 0, 0, 0);
                dateQuery = {
                    ...dateQuery,
                    createdAt: { $gte: weekStart }
                };
                break;
            }
            case 'monthly': {
                const today = new Date();
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                dateQuery = {
                    ...dateQuery,
                    createdAt: { $gte: monthStart }
                };
                break;
            }
            case 'custom': {
                if (start_date && end_date) {
                    const startDate = new Date(start_date);
                    const endDate = new Date(end_date);
                    endDate.setHours(23, 59, 59, 999); // Include the full day
                    if (startDate > endDate) {
                        throw new Error('Start date cannot be after end date.');
                    }
                    dateQuery = {
                        ...dateQuery,
                        createdAt: { $gte: startDate, $lte: endDate }
                    };
                } else {
                    throw new Error('Start and end dates are required for custom filter.');
                }
                break;
            }
            default:
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateQuery = {
                    ...dateQuery,
                    createdAt: { $gte: today }
                };
                break;
        }




         // Fetch the sales data
         const sales = await orderModel.aggregate([
            { $match: dateQuery },
            { 
                $group: {
                    _id: null,
                    totalSales: { $sum: '$payment.finalAmount' },
                    totalDiscount: { 
                        $sum: { 
                            $add: [
                                { $ifNull: ['$payment.totalDiscount', 0] }, 
                                { $ifNull: ['$payment.totalOffer', 0] }, 
                                { $ifNull: ['$payment.couponDiscount', 0] }
                            ]
                        }
                    },
                    totalOrders: { $sum: { $size: '$items' } }
                }
            }
        ]);
        

        // Fetch the order details for the table
        const [orders, totalOrders ] = await Promise.all([
            orderModel.find(dateQuery) 
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit),
            orderModel.countDocuments(dateQuery)
        ]);
       
         
const totalPages = Math.ceil(totalOrders / limit);
        res.render('admin/salesReport', { sales: sales[0], orders, filter, start_date, end_date, currentPage: page, totalPages, limit, dateQuery });
    } catch (error) {
        console.log(error);
    }
}



// Generate PDF Report

exports.generatePDFReport = async (req, res) => {
    const sales = JSON.parse(req.body.sales);
    const query = JSON.parse(req.body.query);

    const orders = await orderModel.find(query).sort({ createdAt: -1 });

    // Ensure orders is an array
    if (!Array.isArray(orders)) {
        return res.status(400).json({ message: 'Orders must be an array' });
    }

    const filePath = path.join(__dirname, '../reports/sales-report.pdf');

    // Create the reports directory if it doesn't exist
    const reportsDir = path.dirname(filePath);
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);

    // Pipe the PDF document to the file stream
    doc.pipe(writeStream);

    // Header Section
    doc.fontSize(20).text('VIBE Sales Report', { align: 'center' });
    doc.moveDown(0.5).fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();

    // Summary Section
    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Revenue: ₹${sales.totalSales}`);
    doc.text(`Total Discount: ₹${sales.totalDiscount}`);
    doc.text(`Total Sales Count: ${sales.totalOrders}`);
    doc.moveDown();

       // Table Header
    doc.fontSize(10)
    .fillColor('white')
    .rect(50, doc.y, 500, 20)
    .fillAndStroke('blue', 'black');

    const headerY = doc.y + 5; 

    doc.fillColor('white'); 


    doc.text('Order ID', 55, headerY, { width: 100, align: 'left' });
    doc.text('Products', 155, headerY, { width: 100, align: 'left' });
    doc.text('Qty', 255, headerY, { width: 30, align: 'center' });
    doc.text('Discount', 285, headerY, { width: 60, align: 'center' });
    doc.text('Offer', 345, headerY, { width: 60, align: 'center' });
    doc.text('Coupon', 405, headerY, { width: 60, align: 'center' });
    doc.text('Total Amount', 465, headerY, { width: 80, align: 'center' });
    doc.text('Payment Status', 545, headerY, { width: 80, align: 'center' });

    doc.moveDown(1); 



    orders.forEach(order => {
        order.items.forEach(item => {
            const currentY = doc.y

            doc.rect(50, currentY, 500, 20).fillAndStroke('#f8f9fa', 'black'); 
            doc.fillColor('black'); 

            doc.text(order.id.slice(0, 10) + '...', 55, currentY + 5, { width: 100, align: 'left' });
            doc.text(item.productName, 155, currentY + 5, { width: 100, align: 'left' });
            doc.text(item.quantity, 255, currentY + 5, { width: 30, align: 'center' });
            doc.text(`₹${item.discount * item.quantity}`, 285, currentY + 5, { width: 60, align: 'center' });
            doc.text(`₹${item.offer}`, 345, currentY + 5, { width: 60, align: 'center' });
            doc.text(`₹${order.payment.couponDiscount ? Math.round(order.payment.couponDiscount / order.items.length) : 0}`, 405, currentY + 5, { width: 60, align: 'center' });
            doc.text(`₹${order.payment.finalAmount}`, 465, currentY + 5, { width: 80, align: 'center' });
            doc.text(order.payment.status, 545, currentY + 5, { width: 80, align: 'center' });

            doc.y += 20; 
        });
    });


    
    // doc.moveDown(2);
    // doc.fontSize(10).text('End of Report', { align: 'center', underline: true });

    
    doc.end();

    // Wait for the file to be written before sending the response
    writeStream.on('finish', () => {
        res.download(filePath, 'sales-report.pdf', (err) => {
            if (err) {
                console.log('Error downloading the file:', err);
            }

            // Delete the file after download
            fs.unlinkSync(filePath);
        });
    });

    // Handle file write errors
    writeStream.on('error', (err) => {
        console.log('Error writing the PDF:', err);
        res.status(500).send('Failed to generate PDF report');
    });
};




exports.generateExcelReport = async (req, res) => {
    try {
        const query = JSON.parse(req.body.query);
        const sales = JSON.parse(req.body.sales);
        const orders = await orderModel.find(query).sort({ createdAt: -1 });

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Styling for header rows
        const headerStyle = {
            font: { bold: true, size: 12 },
            alignment: { vertical: 'middle', horizontal: 'center' },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ADD8E6' } },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            },
        };

        const currencyStyle = {
            numFmt: '₹#,##0.00',
        };

        // Add Header Row
        worksheet.columns = [
           
            { header: 'Order ID', key: 'orderId', width: 40 },
            { header: 'Product', key: 'product', width: 30 },
            { header: 'Quantity', key: 'qty', width: 10 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Offer Discount', key: 'offer', width: 20 },
            { header: 'Coupon Discount', key: 'coupon', width: 20 },
            { header: 'Total', key: 'totalAmount', width: 15 },
            { header: 'Payment Status', key: 'paymentStatus', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
        ];

        worksheet.getRow(1).eachCell((cell) => {
            cell.style = headerStyle;
        });

        orders.forEach((order) => {
            order.items.forEach((item) => {
                
                worksheet.addRow({
                    
                    orderId: order.id, // Truncate order ID
                    product: item.productName,
                    qty: item.quantity,
                    discount: item.discount,
                    offer: item.offer,
                    coupon: order.payment.couponDiscount ? Math.round(order.payment.couponDiscount / order.items.length) : 0,
                    totalAmount: order.payment.finalAmount,
                    paymentStatus: order.payment.paymentStatus,
                    date: new Date(order.createdAt).toLocaleDateString(),
                });
            });
        });

        // Add Summary Row
        const totalRowIndex = worksheet.lastRow.number + 2;

        worksheet.mergeCells(`A${totalRowIndex}:F${totalRowIndex}`);
        worksheet.getCell(`A${totalRowIndex}`).value = 'Total Revenue:';
        worksheet.getCell(`A${totalRowIndex}`).alignment = { horizontal: 'right' };
        worksheet.getCell(`G${totalRowIndex}`).value = sales.totalSales;
        worksheet.getCell(`G${totalRowIndex}`).style = currencyStyle;

        worksheet.mergeCells(`A${totalRowIndex + 1}:F${totalRowIndex + 1}`);
        worksheet.getCell(`A${totalRowIndex + 1}`).value = 'Total Discount:';
        worksheet.getCell(`A${totalRowIndex + 1}`).alignment = { horizontal: 'right' };
        worksheet.getCell(`G${totalRowIndex + 1}`).value = sales.totalDiscount;
        worksheet.getCell(`G${totalRowIndex + 1}`).style = currencyStyle;

        worksheet.mergeCells(`A${totalRowIndex + 2}:F${totalRowIndex + 2}`);
        worksheet.getCell(`A${totalRowIndex + 2}`).value = 'Total Sales Count:';
        worksheet.getCell(`A${totalRowIndex + 2}`).alignment = { horizontal: 'right' };
        worksheet.getCell(`G${totalRowIndex + 2}`).value = sales.totalOrders;

        // Auto-fit rows and columns
        worksheet.columns.forEach((column) => {
            column.width = column.width < 15 ? 15 : column.width;
        });

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

        // Write workbook to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating report');
    }
};


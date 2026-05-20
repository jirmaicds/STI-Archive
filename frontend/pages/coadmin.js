// === UPLOAD FORM HANDLER ===
document.getElementById('article-upload-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const category = document.getElementById('article-category').value;
    const pdfInput = document.getElementById('article-pdf');
    const pdfStatus = document.getElementById('pdf-upload-status');

    let pdfId = null;
    let pdfFilename = null;

    // Handle PDF upload to Couchbase if file is selected
    if (pdfInput && pdfInput.files.length > 0) {
        const pdfFile = pdfInput.files[0];
        pdfStatus.textContent = 'Uploading PDF to Couchbase...';
        pdfStatus.style.color = '#0057b8';

        try {
            // Read file as base64
            const reader = new FileReader();
            const fileData = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(pdfFile);
            });

            // Upload to Couchbase via API
            if (DEBUG) console.log('Uploading PDF to:', window.location.origin + '/api/pdf/upload');
            const uploadResponse = await fetch('/api/pdf/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileData: fileData,
                    filename: pdfFile.name
                })
            });

            if (DEBUG) console.log('PDF upload response status:', uploadResponse.status);
            if (DEBUG) console.log('PDF upload response statusText:', uploadResponse.statusText);

            const responseText = await uploadResponse.text();
            if (DEBUG) console.log('PDF upload response text:', responseText);

            if (!uploadResponse.ok || !responseText) {
                throw new Error('Failed to upload PDF: ' + uploadResponse.status + ' ' + uploadResponse.statusText + ' - ' + responseText);
            }

            const uploadResult = JSON.parse(responseText);
            pdfId = uploadResult.fileId;
            pdfFilename = uploadResult.filename;
            pdfUrl = uploadResult.url || `/api/pdf/${pdfId}`;

            pdfStatus.textContent = 'PDF uploaded successfully!';
            pdfStatus.style.color = 'green';

        } catch (pdfError) {
            console.error('Error uploading PDF - full error:', pdfError);
            console.error('Error message:', pdfError.message);
            if (pdfError.response) {
                console.error('Response data:', pdfError.response.data);
            }
            pdfStatus.textContent = 'Error uploading PDF: ' + pdfError.message;
            pdfStatus.style.color = 'red';
            alert('Warning: PDF upload failed. Article will be saved without PDF.');
        }
    }

    const topicValue = document.getElementById('article-topic').value;
    const levelValue = category === 'research' ? '' : document.getElementById('capstone-grade').value;

    const formData = {
        title: document.getElementById('article-title').value,
        authors: document.getElementById('article-authors-year').value,
        meta: document.getElementById('article-authors-year').value,
        summary: document.getElementById('article-summary').value,
        category: category,
        strand: category === 'research' ? document.getElementById('article-strand').value : document.getElementById('article-program').value,
        level: levelValue,
        program: document.getElementById('article-program').value,
        year: document.getElementById('article-year').value,
        citation: document.getElementById('article-citation').value,
        qualitativeQuantitative: category === 'research' ? document.getElementById('article-qualitative-quantitative').value : '',
        topic: topicValue,
        pdfUrl: pdfUrl
    };
    const articles = getArticles();
    articles.push(formData);
    saveArticles(articles);

    // Add to admin articles for pagination
    const adminArticles = getAdminArticles();
    adminArticles.push(formData);
    saveAdminArticles(adminArticles);

    // Refresh pagination display
    renderAdminArticles();
    // Reset form
    this.reset();
    document.getElementById('article-category').value = 'research';
    document.getElementById('article-level').value = 'shs';
    // Reset topic dropdown
    document.getElementById('article-topic').value = '';
    // Reset strand/program dropdowns
    document.getElementById('article-strand').value = '';
    document.getElementById('article-program').value = '';
    // Reset grade dropdown (for capstone)
    document.getElementById('capstone-grade').value = '';
    // Reset qualitative/quantitative dropdown
    document.getElementById('article-qualitative-quantitative').value = '';
    // Reset PDF input
    pdfInput.value = '';
    pdfStatus.textContent = '';
    // Focus on title field
    document.getElementById('article-title').focus();
});
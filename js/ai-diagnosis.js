/**
 * المساعد الطبي - نظام التشخيص الذكي
 * @version 5.0 - نسخة خفيفة، واقعية 100%، تعتمد فقط على API
 */

// ===== إعدادات APIs =====
const APIS = {
    translate: 'https://translate.googleapis.com/translate_a/single',
    openFDA: {
        url: 'https://api.fda.gov/drug/event.json',
        key: '5qpdeD3i6hvw84SfjQhHdYQZEpq7RUQarzrVmk10'
    }
};

// ===== إخفاء شاشة التحميل =====
(function() {
    const preloader = document.querySelector('.preloader');
    if (preloader) preloader.classList.add('preloader-deactivate');
    setTimeout(() => preloader?.classList.add('preloader-deactivate'), 500);
})();

// ===== الكود الرئيسي =====
$(document).ready(function() {
    let isAnalyzing = false;

    $('#analyzeBtn').click(analyzeSymptoms);
    $('#clearBtn').click(clearAll);

    $('.symptom-tag').click(function() {
        const symptom = $(this).data('symptom');
        const $input = $('#symptomInput');
        $input.val($input.val() ? `${$input.val()}، ${symptom}` : symptom);
        $(this).toggleClass('active');
    });

    $('#symptomInput').keypress(function(e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            analyzeSymptoms();
        }
    });

    async function analyzeSymptoms() {
        const symptoms = $('#symptomInput').val().trim();
        if (!symptoms) return showError('الرجاء إدخال الأعراض أولاً');
        if (isAnalyzing) return;

        toggleLoading(true);
        $('#resultsContainer').empty();

        try {
            showMessage('جاري الترجمة والتحليل...');
            const englishSymptoms = await translateToEnglish(symptoms);
            
            showMessage('جاري البحث في قاعدة بيانات FDA...');
            const results = await searchOpenFDA(englishSymptoms);
            
            if (results?.length) {
                displayResults(results);
                showMessage(`تم العثور على ${results.length} نتائج`);
            } else {
                showError('لم يتم العثور على نتائج في قاعدة FDA');
            }
        } catch (error) {
            console.error('خطأ:', error);
            showError('حدث خطأ في الاتصال بقاعدة FDA');
        } finally {
            toggleLoading(false);
        }
    }

    async function translateToEnglish(text) {
        try {
            const response = await axios.get(APIS.translate, {
                params: { client: 'gtx', sl: 'ar', tl: 'en', dt: 't', q: text },
                timeout: 5000
            });
            return response.data?.[0]?.map(item => item[0]).join(' ') || text;
        } catch {
            return text;
        }
    }

    async function searchOpenFDA(symptoms) {
        try {
            const keywords = symptoms.split(/[\s،,]+/)
                .filter(w => w.length > 2)
                .slice(0, 2)
                .join('+');

            if (!keywords) return null;

            const response = await axios.get(APIS.openFDA.url, {
                params: {
                    search: `patient.reaction.reactionmeddrapt:${keywords}`,
                    limit: 5,
                    api_key: APIS.openFDA.key
                },
                timeout: 8000
            });

            if (!response.data?.results?.length) return null;

            // تجميع النتائج حسب الدواء
            const drugMap = new Map();
            
            response.data.results.forEach(item => {
                const drug = item.patient?.drug?.[0]?.medicinalproduct;
                if (!drug) return;
                
                const reactions = item.patient?.reaction?.map(r => r.reactionmeddrapt).filter(Boolean) || [];
                
                if (!drugMap.has(drug)) {
                    drugMap.set(drug, {
                        reactions: new Set(),
                        count: 0
                    });
                }
                
                const entry = drugMap.get(drug);
                reactions.forEach(r => entry.reactions.add(r));
                entry.count++;
            });

            // تحويل إلى نتائج
            return Array.from(drugMap.entries())
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 3)
                .map(([drug, data], i) => ({
                    name: drug,
                    probability: Math.min(65 + (data.count * 5), 92),
                    description: `تفاعل دوائي محتمل مع ${drug} بناء على ${data.count} تقرير في قاعدة FDA`,
                    symptoms: Array.from(data.reactions).slice(0, 5).join('، ') || 'أعراض متعددة',
                    treatment: 'استشر طبيبك لتقييم التفاعل الدوائي',
                    medications: drug,
                    advice: `هذا الدواء ${drug} قد يسبب الأعراض المذكورة. لا توقف الدواء دون استشارة الطبيب.`,
                    source: 'FDA'
                }));

        } catch (error) {
            console.log('FDA Error:', error.message);
            return null;
        }
    }

    function displayResults(results) {
        const html = results.map((r, i) => `
            <div class="card mb-3" style="animation-delay: ${i * 0.1}s">
                <div class="card-header bg-primary text-white">
                    <div class="d-flex justify-content-between">
                        <h5 class="mb-0">${r.name}</h5>
                        <span class="badge badge-light">${r.probability}%</span>
                    </div>
                </div>
                <div class="card-body">
                    <p><i class="icofont-info-circle text-info"></i> <strong>الوصف:</strong> ${r.description}</p>
                    <p><i class="icofont-stethoscope text-primary"></i> <strong>الأعراض:</strong> ${r.symptoms}</p>
                    <p><i class="icofont-prescription text-success"></i> <strong>العلاج:</strong> ${r.treatment}</p>
                    <p><i class="icofont-capsule text-warning"></i> <strong>الدواء:</strong> ${r.medications}</p>
                    <p><i class="icofont-light-bulb text-danger"></i> <strong>نصيحة:</strong> ${r.advice}</p>
                    <small class="text-muted">المصدر: FDA | ${new Date().toLocaleDateString('ar-EG')}</small>
                </div>
            </div>
        `).join('');

        $('#resultsContainer').html(`
            <div class="mb-3"><h4>نتائج البحث في FDA</h4></div>
            ${html}
            <div class="alert alert-info mt-3">
                <i class="icofont-ui-call"></i> للطوارئ: <strong>101</strong> | استشارات: <strong>121</strong>
            </div>
            <div class="small text-muted mt-2">
                * هذه النتائج للاسترشاد فقط ولا تغني عن استشارة الطبيب
            </div>
        `);
    }

    function toggleLoading(loading) {
        isAnalyzing = loading;
        $('#analyzeBtn').prop('disabled', loading);
        $('.btn-text').toggle(!loading);
        $('#loadingSpinner').toggleClass('d-none', !loading);
    }

    function showMessage(msg) {
        $('#errorMessage').removeClass('d-none alert-danger').addClass('alert-info')
            .html(`<i class="icofont-info-circle"></i> ${msg}`);
        setTimeout(() => $('#errorMessage').addClass('d-none'), 3000);
    }

    function showError(msg) {
        $('#errorMessage').removeClass('d-none alert-info').addClass('alert-danger')
            .html(`<i class="icofont-exclamation-circle"></i> ${msg}`);
        setTimeout(() => $('#errorMessage').addClass('d-none'), 4000);
    }

    function clearAll() {
        $('#symptomInput').val('');
        $('#resultsContainer').empty();
        $('.symptom-tag').removeClass('active');
        showMessage('تم المسح');
    }
});
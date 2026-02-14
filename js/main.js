/**
 * المساعد الطبي - الملف الرئيسي
 * الإصدار: 2.0
 * التاريخ: 2024
 */

$(document).ready(function () {
    'use strict';

    // ====== التهيئة العامة ======
    initNiceSelect();
    initDatepicker();
    initEventListeners();
    initAOS();
    
    /**
     * تفعيل NiceSelect
     */
    function initNiceSelect() {
        if (typeof $.fn.niceSelect !== 'undefined' && $('select').length) {
            $('select').niceSelect();
        }
    }

    /**
     * تفعيل Datepicker
     */
    function initDatepicker() {
        if (typeof $.fn.datepicker !== 'undefined' && $('#datepicker').length) {
            $("#datepicker").datepicker({
                format: 'dd/mm/yyyy',
                autoclose: true,
                todayHighlight: true,
                language: 'ar'
            });
        }
    }

    /**
     * تفعيل AOS للحركات
     */
    function initAOS() {
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true,
                offset: 100
            });
        }
    }

    /**
     * تهيئة جميع الأحداث
     */
    function initEventListeners() {
        // إظهار نتائج الفحص
        $('.check-ai').on('click', function (e) {
            e.preventDefault();
            $('.result-of-check').fadeIn(300);
        });

        // تغيير نص زر رفع الصورة
        $('#photo-upload').on('change', function () {
            const fileName = $(this).val().split('\\').pop();
            if (fileName) {
                $(this).siblings('label').text(fileName);
            }
        });

        // معاينة الصورة الشخصية
        initImagePreview();

        // التحقق من تطابق كلمة المرور
        initPasswordValidation();

        // تفعيل القوائم المنسدلة
        initDropdowns();

        // إغلاق التنبيهات تلقائياً
        autoCloseAlerts();
    }

    /**
     * معاينة الصورة قبل الرفع
     */
    function initImagePreview() {
        const inputElement = $("#file-upload");
        const imageElement = $("#profile-image");

        if (inputElement.length && imageElement.length) {
            inputElement.on("change", function () {
                const file = this.files[0];
                if (file) {
                    // التحقق من حجم الملف (max 2MB)
                    if (file.size > 2 * 1024 * 1024) {
                        alert('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت');
                        return;
                    }
                    
                    // التحقق من نوع الملف
                    if (!file.type.match('image.*')) {
                        alert('الرجاء اختيار ملف صورة صالح');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = function (e) {
                        imageElement.attr("src", e.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });

            $("#upload-button").on("click", function () {
                inputElement.click();
            });
        }
    }

    /**
     * التحقق من صحة كلمة المرور
     */
    function initPasswordValidation() {
        const passwordInput = $('#password');
        const confirmInput = $('input[name="confirm-password"]');

        if (confirmInput.length) {
            confirmInput.on('keyup', function() {
                const password = passwordInput.val();
                const confirm = $(this).val();
                
                if (password !== confirm) {
                    $(this).css('border-color', '#dc3545');
                    $(this).attr('title', 'كلمة المرور غير متطابقة');
                } else {
                    $(this).css('border-color', '#28a745');
                    $(this).attr('title', '');
                }
            });
        }

        // منع autocomplete
        $('input[type="password"]').attr('autocomplete', 'new-password');
    }

    /**
     * تفعيل القوائم المنسدلة المخصصة
     */
    function initDropdowns() {
        // فتح/إغلاق القائمة
        $(document).on('click', '.nice-select', function(e) {
            e.stopPropagation();
            $('.nice-select').not($(this)).removeClass('open');
            $(this).toggleClass('open');
        });

        // اختيار عنصر
        $(document).on('click', '.nice-select .option', function() {
            const value = $(this).data('value');
            const text = $(this).text();
            const select = $(this).closest('.nice-select');
            
            select.find('.current').text(text);
            select.removeClass('open');
            
            // تحديث الـ select المخفي
            const hiddenSelect = select.prev('select');
            if (hiddenSelect.length) {
                hiddenSelect.val(value).trigger('change');
            }
        });

        // إغلاق القائمة عند النقر خارجها
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.nice-select').length) {
                $('.nice-select').removeClass('open');
            }
        });

        // دعم لوحة المفاتيح
        $(document).on('keydown', '.nice-select', function(e) {
            const select = $(this);
            const options = select.find('.option');
            const current = select.find('.focus');
            
            switch(e.which) {
                case 40: // سهم لأسفل
                    e.preventDefault();
                    moveFocus(options, current, 'next');
                    break;
                case 38: // سهم لأعلى
                    e.preventDefault();
                    moveFocus(options, current, 'prev');
                    break;
                case 13: // Enter
                case 32: // Space
                    e.preventDefault();
                    if (select.hasClass('open')) {
                        current.trigger('click');
                    } else {
                        select.trigger('click');
                    }
                    break;
                case 27: // ESC
                    select.removeClass('open');
                    break;
            }
        });
    }

    /**
     * تحريك التركيز في القائمة
     */
    function moveFocus(options, current, direction) {
        if (!options.length) return;
        
        const index = current.length ? options.index(current) : -1;
        let nextIndex = direction === 'next' ? index + 1 : index - 1;
        
        if (nextIndex >= options.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = options.length - 1;
        
        options.removeClass('focus');
        options.eq(nextIndex).addClass('focus');
    }

    /**
     * إغلاق التنبيهات تلقائياً
     */
    function autoCloseAlerts() {
        setTimeout(function() {
            $('.alert').fadeOut(500);
        }, 5000);
    }

    /**
     * حفظ البيانات في localStorage
     */
    window.saveToStorage = function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch(e) {
            console.error('خطأ في الحفظ:', e);
            return false;
        }
    };

    /**
     * استرجاع البيانات من localStorage
     */
    window.getFromStorage = function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch(e) {
            console.error('خطأ في الاسترجاع:', e);
            return null;
        }
    };
});

// ====== إخفاء شاشة التحميل ======
$(window).on('load', function () {
    setTimeout(function() {
        $('.preloader').addClass('preloader-deactivate');
    }, 500);
});

// ====== منع النقر المزدوج على الأزرار ======
$('button, .btn').on('click', function(e) {
    if ($(this).hasClass('no-double')) {
        $(this).prop('disabled', true);
        setTimeout(() => $(this).prop('disabled', false), 1000);
    }
});
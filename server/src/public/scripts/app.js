$(document).ready(function() {
    $('li.active').removeClass('active');
    $('a[href="' + location.pathname + '"]').closest('li').addClass('active'); 
    if(location.pathname === "/containers"){
        $("#home").addClass('active'); 
    }
});
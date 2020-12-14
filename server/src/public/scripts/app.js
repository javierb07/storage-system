$(document).ready(function() {
    $('li.active').removeClass('active');
    $('a[href="' + location.pathname + '"]').closest('li').addClass('active'); 
    if(location.pathname === "/containers"){
        $("#home").addClass('active'); 
    }
    $("#p1").hide()
    $("#p2").hide()
    $("#p3").hide()
    $("#p4").hide()
    $("#p5").hide()
    $("#btn-2").hide()
    $("#btn-3").hide()
    $("#btn-4").hide()
    $("#btn-5").hide()
    $("#weight_input1").hide()
    $("#weight_input2").hide()
    $("#name_input").hide()
});

$("#btn-1").click(function(){
    $.ajax({
        url: location.pathname + "/calibration?ip=" + $("#containerIP").html() ,
        type: "GET"
    })
    $("#btn-1").hide();
    $("#btn-2").show();
    $("#p1").show()
})

$("#btn-2").click(function(){
    $.ajax({
        url: location.pathname + "/zero_offset?ip=" + $("#containerIP").html() ,
        type: "GET"
    })
    $("#btn-2").hide();
    $("#btn-3").show();
    $("#p1").hide()
    $("#p2").show()
    $("#weight_input1").show()
})

$("#btn-3").click(function(){
    var weight_input = $("#weight_input1").val();
    console.log(weight_input);
    $.ajax({
        url: location.pathname + "/weight_value?ip=" + $("#containerIP").html() ,
        type: "POST",
        data: {input: weight_input},
    })
    $("#btn-3").hide();
    $("#btn-4").show();
    $("#p2").hide()
    $("#p3").show()
    $("#weight_input1").hide()
    $("#weight_input2").show()

})

$("#btn-4").click(function(){
    var weight_input = $("#weight_input2").val();
    $.ajax({
        url: location.pathname + "/part_weight?ip=" + $("#containerIP").html() ,
        type: "POST",
        data: {input: weight_input},
    })
    $("#btn-4").hide();
    $("#btn-5").show();
    $("#p3").hide()
    $("#p4").show()
    $("#weight_input2").hide()
    $("#name_input").show()
})

$("#btn-5").click(function(){
    var name_input = $("#name_input").val();
    $.ajax({
        url: location.pathname + "/part_name?ip=" + $("#containerIP").html() ,
        type: "POST",
        data: {input: name_input},
    })
    $("#btn-5").hide();
    $("#p4").hide()
    $("#p5").show()
    $("#name_input").hide()
})
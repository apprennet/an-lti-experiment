$(document).on('click', '#request', function() {
  var params = JSON.parse($('#params').val());

  $.ajax({
    type: 'GET',
    url: '/query',
    data: params,
    success: function(res) {
      console.log(res);
    },
    error: function(res) {
      console.log(res);
    }
  });
});

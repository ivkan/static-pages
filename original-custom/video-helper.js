document.addEventListener('click', function(event) {
    const target = event.target.closest('.l-video-module');
    if (!target || !target.closest('.l-video-wrapper')) return;
    
    event.preventDefault();
    const wrapper = target.closest('.l-video-wrapper');
    wrapper.classList.add('active');
    const video = wrapper.querySelector('.main-video');
    if (video) video.play();
    console.log('click', {wrapper});
});

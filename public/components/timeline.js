const timelineNav = document.querySelector('.rc-timeline-nav');
const timelineNavItems = timelineNav.children;

timelineNav.addEventListener('click', e => {
  if (e.target.matches('li') && e.target.classList.contains('rc-timeline-nav-item__active')) {
    return;
  } else {
    [...timelineNavItems].forEach(navItem => {
      navItem.classList.remove('rc-timeline-nav-item__active');
    });
    e.target.classList.add('rc-timeline-nav-item__active');
  }
});

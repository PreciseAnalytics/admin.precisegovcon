import React, { useState, MouseEvent } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  Box, 
  Container,
  Badge,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Menu as MenuIcon,
  NotificationsNone as NotificationsIcon,
  AccountCircle,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

interface NavButtonProps {
  active?: boolean;
}

// Define menu item type
interface MenuItem {
  id: string;
  label: string;
  icon: JSX.Element;
}

// Styled components for modern look
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(10px)',
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.9,
  },
}));

const LogoDot = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: theme.palette.secondary.main,
  marginLeft: 4,
}));

const NavButton = styled(Button)<NavButtonProps>(({ theme, active }) => ({
  color: theme.palette.common.white,
  margin: theme.spacing(0, 0.5),
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(1),
  textTransform: 'none',
  fontSize: '1rem',
  fontWeight: active ? 600 : 400,
  backgroundColor: active ? alpha(theme.palette.common.white, 0.15) : 'transparent',
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
    transform: 'translateY(-2px)',
    transition: 'all 0.2s ease',
  },
  '& .MuiButton-startIcon': {
    marginRight: theme.spacing(1),
    color: active ? theme.palette.secondary.main : theme.palette.common.white,
  },
}));

const IconButtonStyled = styled(IconButton)(({ theme }) => ({
  color: theme.palette.common.white,
  backgroundColor: alpha(theme.palette.common.white, 0.1),
  marginLeft: theme.spacing(1),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.2),
    transform: 'scale(1.05)',
    transition: 'all 0.2s ease',
  },
}));

const ProfileContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginLeft: theme.spacing(2),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(3),
  backgroundColor: alpha(theme.palette.common.white, 0.1),
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.2),
    transition: 'all 0.2s ease',
  },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 32,
  height: 32,
  border: `2px solid ${theme.palette.secondary.main}`,
}));

const Header = () => {
  const theme = useTheme();
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <AssessmentIcon /> },
    { id: 'team', label: 'Team', icon: <PeopleIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
    // Add your navigation logic here
  };

  const handleProfileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  return (
    <StyledAppBar position="sticky">
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 } }}>
          {/* Logo Section */}
          <LogoContainer onClick={() => handleMenuClick('dashboard')}>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.5px',
                background: `linear-gradient(135deg, ${theme.palette.common.white} 0%, ${theme.palette.secondary.light} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Brand
            </Typography>
            <LogoDot />
          </LogoContainer>

          {/* Desktop Navigation */}
          <Box sx={{ 
            flexGrow: 1, 
            display: { xs: 'none', md: 'flex' }, 
            justifyContent: 'center',
            gap: 1,
            mx: 2 
          }}>
            {menuItems.map((item) => (
              <NavButton
                key={item.id}
                startIcon={item.icon}
                active={activeMenu === item.id}
                onClick={() => handleMenuClick(item.id)}
              >
                {item.label}
              </NavButton>
            ))}
          </Box>

          {/* Right Side Icons & Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Mobile Menu Icon */}
            <IconButtonStyled
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenuOpen}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButtonStyled>

            {/* Notification Icon */}
            <IconButtonStyled size="large" color="inherit">
              <Badge badgeContent={4} color="secondary">
                <NotificationsIcon />
              </Badge>
            </IconButtonStyled>

            {/* Profile Section */}
            <ProfileContainer onClick={handleProfileMenuOpen}>
              <StyledAvatar 
                alt="John Doe" 
                src="/path-to-avatar.jpg"
              >
                <AccountCircle />
              </StyledAvatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
                  John Doe
                </Typography>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
                  Admin
                </Typography>
              </Box>
            </ProfileContainer>
          </Box>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            onClick={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: 2,
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                },
              },
            }}
          >
            <MenuItem>Profile</MenuItem>
            <MenuItem>My Account</MenuItem>
            <MenuItem>Settings</MenuItem>
            <MenuItem sx={{ color: 'error.main' }}>Logout</MenuItem>
          </Menu>

          {/* Mobile Menu */}
          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={handleMobileMenuClose}
            onClick={handleMobileMenuClose}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 250,
                borderRadius: 2,
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              },
            }}
          >
            {menuItems.map((item) => (
              <MenuItem 
                key={item.id} 
                onClick={() => {
                  handleMenuClick(item.id);
                  handleMobileMenuClose();
                }}
                selected={activeMenu === item.id}
                sx={{
                  py: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    '& .MuiSvgIcon-root': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              >
                <Box component="span" sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </Box>
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </Container>
    </StyledAppBar>
  );
};

export default Header;
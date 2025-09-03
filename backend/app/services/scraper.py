from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import logging
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class RequirementScraper:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.setup_driver()
    
    def setup_driver(self):
        """Configure Chrome driver with headless options"""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, 10)
            logging.info("Chrome driver initialized successfully")
        except Exception as e:
            logging.error(f"Failed to initialize Chrome driver: {e}")
            raise
    
    def login(self, username: str, password: str, login_url: str) -> bool:
        """Login to the external platform"""
        try:
            self.driver.get(login_url)
            
            # Wait for login form to load
            username_field = self.wait.until(
                EC.presence_of_element_located((By.NAME, "username"))
            )
            password_field = self.driver.find_element(By.NAME, "password")
            
            # Fill credentials
            username_field.send_keys(username)
            password_field.send_keys(password)
            
            # Submit form
            login_button = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            login_button.click()
            
            # Wait for successful login (redirect or dashboard element)
            self.wait.until(
                EC.presence_of_element_located((By.CLASS_NAME, "dashboard"))
            )
            
            logging.info("Login successful")
            return True
            
        except TimeoutException:
            logging.error("Login timeout - page elements not found")
            return False
        except Exception as e:
            logging.error(f"Login failed: {e}")
            return False
    
    def extract_requirements(self, requirements_url: str) -> List[Dict]:
        """Extract requirements from the platform"""
        try:
            self.driver.get(requirements_url)
            
            # Wait for requirements list to load
            requirements_container = self.wait.until(
                EC.presence_of_element_located((By.CLASS_NAME, "requirements-list"))
            )
            
            requirements = []
            requirement_elements = self.driver.find_elements(By.CLASS_NAME, "requirement-item")
            
            for element in requirement_elements:
                try:
                    requirement = {
                        'external_id': element.get_attribute('data-id'),
                        'title': element.find_element(By.CLASS_NAME, 'title').text,
                        'description': element.find_element(By.CLASS_NAME, 'description').text,
                        'priority': element.find_element(By.CLASS_NAME, 'priority').text.lower(),
                        'status': element.find_element(By.CLASS_NAME, 'status').text.lower(),
                        'type': element.find_element(By.CLASS_NAME, 'type').text,
                        'created_date': element.find_element(By.CLASS_NAME, 'created-date').text,
                        'assigned_to': element.find_element(By.CLASS_NAME, 'assigned-to').text
                    }
                    requirements.append(requirement)
                    
                except NoSuchElementException as e:
                    logging.warning(f"Failed to extract requirement element: {e}")
                    continue
            
            logging.info(f"Successfully extracted {len(requirements)} requirements")
            return requirements
            
        except TimeoutException:
            logging.error("Timeout waiting for requirements page to load")
            return []
        except Exception as e:
            logging.error(f"Failed to extract requirements: {e}")
            return []
    
    def close(self):
        """Close the browser driver"""
        if self.driver:
            self.driver.quit()
            logging.info("Browser driver closed")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

# Example usage
if __name__ == "__main__":
    scraper = RequirementScraper()
    try:
        # Login
        success = scraper.login(
            username=os.getenv("SCRAPING_USERNAME"),
            password=os.getenv("SCRAPING_PASSWORD"),
            login_url=os.getenv("SCRAPING_URL")
        )
        
        if success:
            # Extract requirements
            requirements = scraper.extract_requirements(
                requirements_url=f"{os.getenv('SCRAPING_URL')}/requirements"
            )
            print(f"Extracted {len(requirements)} requirements")
            
            for req in requirements[:3]:  # Show first 3
                print(f"- {req['title']} ({req['priority']})")
    finally:
        scraper.close()

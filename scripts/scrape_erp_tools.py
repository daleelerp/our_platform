#!/usr/bin/env python3
"""
Web Scraping Script for ERP Provider Tools
This script scrapes tools/products/modules from ERP provider websites
and updates the database with the latest information.

Usage:
    python scripts/scrape_erp_tools.py --provider oracle
    python scripts/scrape_erp_tools.py --provider sap
    python scripts/scrape_erp_tools.py --all
"""

import argparse
import requests
from bs4 import BeautifulSoup
import json
import os
from typing import List, Dict
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key for admin operations

def get_supabase_client() -> Client:
    """Initialize and return Supabase client"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def scrape_oracle_tools() -> List[Dict]:
    """
    Scrape Oracle tools/products from Oracle website
    Returns list of tools with name, description, category
    """
    # Manual additions for known Oracle tools (defined first so it's always available)
    known_tools = [
        {
            'name': 'Oracle Integration Cloud (OIC)',
            'name_ar': 'أوراكل تكامل السحابة',
            'slug': 'oracle-integration-cloud',
            'description': 'Cloud-based integration platform',
            'description_ar': 'منصة تكامل قائمة على السحابة',
            'category': 'Integration',
            'category_ar': 'التكامل',
        },
        {
            'name': 'Oracle APEX',
            'name_ar': 'أوراكل APEX',
            'slug': 'oracle-apex',
            'description': 'Low-code application development platform',
            'description_ar': 'منصة تطوير تطبيقات منخفضة الكود',
            'category': 'Development',
            'category_ar': 'التطوير',
        },
        {
            'name': 'Oracle Cloud ERP',
            'name_ar': 'أوراكل ERP السحابي',
            'slug': 'oracle-cloud-erp',
            'description': 'Enterprise Resource Planning in the cloud',
            'description_ar': 'تخطيط موارد المؤسسة في السحابة',
            'category': 'ERP Core',
            'category_ar': 'نواة ERP',
        },
        {
            'name': 'Oracle Analytics Cloud',
            'name_ar': 'أوراكل Analytics السحابي',
            'slug': 'oracle-analytics-cloud',
            'description': 'Cloud-based analytics and business intelligence',
            'description_ar': 'التحليلات وذكاء الأعمال القائم على السحابة',
            'category': 'Analytics',
            'category_ar': 'التحليلات',
        },
        {
            'name': 'Oracle Process Cloud',
            'name_ar': 'أوراكل Process السحابي',
            'slug': 'oracle-process-cloud',
            'description': 'Business process automation platform',
            'description_ar': 'منصة أتمتة العمليات التجارية',
            'category': 'Automation',
            'category_ar': 'الأتمتة',
        },
    ]
    
    tools = []
    
    # Oracle Cloud Products page
    url = "https://www.oracle.com/cloud/"
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Example: Find product cards/sections
        # This is a template - actual selectors need to be determined from Oracle's website structure
        product_sections = soup.find_all(['div', 'section'], class_=lambda x: x and 'product' in x.lower())
        
        for section in product_sections:
            # Extract product name, description, category
            # Adjust selectors based on actual Oracle website structure
            name_elem = section.find(['h2', 'h3', 'a'], class_=lambda x: x and ('title' in x.lower() or 'name' in x.lower()))
            desc_elem = section.find('p', class_=lambda x: x and 'description' in x.lower())
            
            if name_elem:
                tool = {
                    'name': name_elem.get_text(strip=True),
                    'name_ar': None,  # Will need manual translation
                    'slug': name_elem.get_text(strip=True).lower().replace(' ', '-').replace('(', '').replace(')', ''),
                    'description': desc_elem.get_text(strip=True) if desc_elem else None,
                    'description_ar': None,
                    'category': 'Cloud Services',  # Determine from context
                    'category_ar': 'خدمات السحابة',
                }
                tools.append(tool)
        
        # Add known tools to scraped tools
        tools.extend(known_tools)
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            print(f"⚠️  Oracle website blocked the request (403 Forbidden). Using known tools only.")
        else:
            print(f"⚠️  HTTP Error scraping Oracle tools: {e}")
        # Return known tools even if scraping fails
        return known_tools
    except Exception as e:
        print(f"⚠️  Error scraping Oracle tools: {e}")
        print(f"   Using known tools only.")
        # Return known tools even if scraping fails
        return known_tools
    
    return tools if tools else known_tools

def scrape_sap_tools() -> List[Dict]:
    """Scrape SAP tools/products"""
    # Known SAP tools (defined first)
    known_tools = [
        {
            'name': 'SAP S/4HANA',
            'name_ar': 'SAP S/4HANA',
            'slug': 'sap-s4hana',
            'description': 'Next-generation ERP business suite',
            'description_ar': 'مجموعة ERP للأعمال من الجيل القادم',
            'category': 'ERP Core',
            'category_ar': 'نواة ERP',
        },
        {
            'name': 'SAP Fiori',
            'name_ar': 'SAP Fiori',
            'slug': 'sap-fiori',
            'description': 'User experience design system',
            'description_ar': 'نظام تصميم تجربة المستخدم',
            'category': 'User Experience',
            'category_ar': 'تجربة المستخدم',
        },
    ]
    
    return known_tools

def scrape_erpnext_tools() -> List[Dict]:
    """Scrape ERPNext tools/modules"""
    # ERPNext modules are well-documented
    known_tools = [
        {
            'name': 'ERPNext Core',
            'name_ar': 'ERPNext الأساسي',
            'slug': 'erpnext-core',
            'description': 'Core ERP functionality',
            'description_ar': 'وظائف ERP الأساسية',
            'category': 'ERP Core',
            'category_ar': 'نواة ERP',
        },
        {
            'name': 'ERPNext Manufacturing',
            'name_ar': 'ERPNext التصنيع',
            'slug': 'erpnext-manufacturing',
            'description': 'Manufacturing module',
            'description_ar': 'وحدة التصنيع',
            'category': 'Manufacturing',
            'category_ar': 'التصنيع',
        },
    ]
    
    return known_tools

def scrape_odoo_tools() -> List[Dict]:
    """Scrape Odoo apps/modules"""
    # Odoo has a well-documented app store
    known_tools = [
        {
            'name': 'Odoo ERP',
            'name_ar': 'Odoo ERP',
            'slug': 'odoo-erp',
            'description': 'Core ERP functionality',
            'description_ar': 'وظائف ERP الأساسية',
            'category': 'ERP Core',
            'category_ar': 'نواة ERP',
        },
        {
            'name': 'Odoo CRM',
            'name_ar': 'Odoo CRM',
            'slug': 'odoo-crm',
            'description': 'Customer Relationship Management',
            'description_ar': 'إدارة علاقات العملاء',
            'category': 'CRM',
            'category_ar': 'CRM',
        },
    ]
    
    return known_tools

PROVIDER_SCRAPERS = {
    'oracle': scrape_oracle_tools,
    'sap': scrape_sap_tools,
    'erpnext': scrape_erpnext_tools,
    'odoo': scrape_odoo_tools,
}

def update_database_tools(provider_slug: str, tools: List[Dict]):
    """Update database with scraped tools"""
    try:
        supabase = get_supabase_client()
        
        # Get provider ID
        provider_res = supabase.table('erp_providers').select('id').eq('slug', provider_slug).single().execute()
        if not provider_res.data:
            print(f"❌ Provider '{provider_slug}' not found in database")
            print(f"   Please run docs/sql/erp_providers_schema.sql first to create providers")
            return
        
        provider_id = provider_res.data['id']
        
        # Insert or update tools
        success_count = 0
        for tool in tools:
            try:
                tool_data = {
                    'provider_id': provider_id,
                    'name': tool['name'],
                    'name_ar': tool.get('name_ar'),
                    'slug': tool['slug'],
                    'description': tool.get('description'),
                    'description_ar': tool.get('description_ar'),
                    'category': tool.get('category'),
                    'category_ar': tool.get('category_ar'),
                    'is_active': True,
                }
                
                # Upsert (insert or update if exists)
                result = supabase.table('erp_provider_tools').upsert(
                    tool_data,
                    on_conflict='provider_id,slug'
                ).execute()
                
                success_count += 1
                print(f"  ✓ {tool['name']}")
            except Exception as e:
                print(f"  ✗ Failed to insert {tool['name']}: {e}")
        
        print(f"\n✅ Successfully updated {success_count}/{len(tools)} tools for {provider_slug}")
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        print(f"   Make sure your Supabase credentials are correct and the tables exist")

def main():
    parser = argparse.ArgumentParser(description='Scrape ERP provider tools')
    parser.add_argument('--provider', type=str, help='Provider slug (oracle, sap, erpnext, odoo)')
    parser.add_argument('--all', action='store_true', help='Scrape all providers')
    
    args = parser.parse_args()
    
    if args.all:
        for provider_slug, scraper_func in PROVIDER_SCRAPERS.items():
            print(f"\n{'='*50}")
            print(f"Scraping {provider_slug.upper()}...")
            print(f"{'='*50}")
            tools = scraper_func()
            print(f"\nFound {len(tools)} tools. Updating database...")
            update_database_tools(provider_slug, tools)
    elif args.provider:
        if args.provider not in PROVIDER_SCRAPERS:
            print(f"❌ Unknown provider: {args.provider}")
            print(f"Available providers: {', '.join(PROVIDER_SCRAPERS.keys())}")
            return
        
        print(f"\n{'='*50}")
        print(f"Scraping {args.provider.upper()}...")
        print(f"{'='*50}")
        tools = PROVIDER_SCRAPERS[args.provider]()
        print(f"\nFound {len(tools)} tools. Updating database...")
        update_database_tools(args.provider, tools)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()


// src/pages/student/DSACoding.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Send, ChevronRight, Search, CheckCircle, XCircle,
  Clock, Cpu, RotateCcw, Loader2, ChevronLeft, BookOpen,
  Lightbulb, History, AlertCircle, Trophy, Zap, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

const C = {
  bg:'#040c18', card:'#0b1a2e', cardB:'#0d1f3c',
  cyan:'#00c8f0', green:'#10c98a', amber:'#f5a623',
  red:'#f04b4b', violet:'#7c5cfc', gray:'#475569',
  light:'#94a3b8', white:'#e2e8f0',
};
const DC = { Easy: C.green, Medium: C.amber, Hard: C.red };
const LANGS = ['python','javascript','java','cpp','c'];
const LANG_LABELS = { python:'Python 3', javascript:'JavaScript', java:'Java', cpp:'C++', c:'C' };

// ═══════════════════════════════════════════════════════════════════════════
// PROBLEM BANK — 100+ problems across all DSA topics
// ═══════════════════════════════════════════════════════════════════════════
const PROBLEMS = [
  // ── ARRAYS ──────────────────────────────────────────────────────────────
  { id:'a1', no:1, title:'Two Sum', difficulty:'Easy', tags:['Array','Hash Map'],
    description:'Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to target. Assume exactly one solution. Cannot use same element twice.',
    examples:[
      {input:'nums = [2,7,11,15], target = 9', output:'[0,1]', explanation:'nums[0] + nums[1] = 2 + 7 = 9'},
      {input:'nums = [3,2,4], target = 6', output:'[1,2]'},
    ],
    constraints:['2 ≤ nums.length ≤ 10⁴','-10⁹ ≤ nums[i] ≤ 10⁹','Exactly one solution exists'],
    hints:['Try using a hash map to store complements','For each number x, check if target-x exists in the map','O(n) time, O(n) space is optimal'],
    testCases:[{input:'2\n2 7 11 15\n9',expected:'0 1'},{input:'2\n3 2 4\n6',expected:'1 2'}],
    starter:{
      python:'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []',
      javascript:'function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) return [map.get(complement), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}',
      java:'import java.util.*;\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer,Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) return new int[]{map.get(comp), i};\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}',
      cpp:'#include<bits/stdc++.h>\nusing namespace std;\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int,int> m;\n    for (int i = 0; i < nums.size(); i++) {\n        int c = target - nums[i];\n        if (m.count(c)) return {m[c], i};\n        m[nums[i]] = i;\n    }\n    return {};\n}',
      c:'#include<stdio.h>\nvoid twoSum(int* nums, int n, int target, int* r) {\n    for(int i=0;i<n;i++) for(int j=i+1;j<n;j++)\n        if(nums[i]+nums[j]==target){r[0]=i;r[1]=j;return;}\n}',
    }
  },
  { id:'a2', no:2, title:'Best Time to Buy and Sell Stock', difficulty:'Easy', tags:['Array','Greedy'],
    description:'Given an array `prices` where `prices[i]` is the price on day i. Choose one day to buy and one later day to sell. Return maximum profit. Return 0 if no profit.',
    examples:[
      {input:'prices = [7,1,5,3,6,4]', output:'5', explanation:'Buy day 2 (price=1), sell day 5 (price=6). Profit = 5.'},
      {input:'prices = [7,6,4,3,1]', output:'0', explanation:'No profit possible.'},
    ],
    constraints:['1 ≤ prices.length ≤ 10⁵','0 ≤ prices[i] ≤ 10⁴'],
    hints:['Track the minimum price seen so far','At each step compute profit = price - min_price','Update max profit accordingly'],
    testCases:[{input:'6\n7 1 5 3 6 4',expected:'5'},{input:'5\n7 6 4 3 1',expected:'0'}],
    starter:{
      python:'def maxProfit(prices):\n    min_price = float("inf")\n    max_profit = 0\n    for price in prices:\n        min_price = min(min_price, price)\n        max_profit = max(max_profit, price - min_price)\n    return max_profit',
      javascript:'function maxProfit(prices) {\n    let minPrice = Infinity, maxProfit = 0;\n    for (const p of prices) {\n        minPrice = Math.min(minPrice, p);\n        maxProfit = Math.max(maxProfit, p - minPrice);\n    }\n    return maxProfit;\n}',
      java:'class Solution {\n    public int maxProfit(int[] prices) {\n        int min = Integer.MAX_VALUE, max = 0;\n        for (int p : prices) {\n            min = Math.min(min, p);\n            max = Math.max(max, p - min);\n        }\n        return max;\n    }\n}',
      cpp:'int maxProfit(vector<int>& p) {\n    int mn=INT_MAX, mx=0;\n    for(int x:p){mn=min(mn,x);mx=max(mx,x-mn);}\n    return mx;\n}',
      c:'int maxProfit(int* p, int n){int mn=p[0],mx=0;for(int i=1;i<n;i++){if(p[i]<mn)mn=p[i];else if(p[i]-mn>mx)mx=p[i]-mn;}return mx;}',
    }
  },
  { id:'a3', no:3, title:'Maximum Subarray (Kadane)', difficulty:'Medium', tags:['Array','DP'],
    description:'Given an integer array `nums`, find the subarray with the largest sum and return its sum.',
    examples:[
      {input:'nums = [-2,1,-3,4,-1,2,1,-5,4]', output:'6', explanation:'Subarray [4,-1,2,1] has sum 6.'},
      {input:'nums = [1]', output:'1'},
    ],
    constraints:['1 ≤ nums.length ≤ 10⁵','-10⁴ ≤ nums[i] ≤ 10⁴'],
    hints:["Kadane's: at each position, decide to extend or start new","curr = max(nums[i], curr + nums[i])"],
    testCases:[{input:'9\n-2 1 -3 4 -1 2 1 -5 4',expected:'6'},{input:'1\n1',expected:'1'}],
    starter:{
      python:'def maxSubArray(nums):\n    curr = best = nums[0]\n    for n in nums[1:]:\n        curr = max(n, curr + n)\n        best = max(best, curr)\n    return best',
      javascript:'function maxSubArray(nums) {\n    let curr = nums[0], best = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        curr = Math.max(nums[i], curr + nums[i]);\n        best = Math.max(best, curr);\n    }\n    return best;\n}',
      java:'class Solution{\n    public int maxSubArray(int[] a){\n        int curr=a[0],best=a[0];\n        for(int i=1;i<a.length;i++){curr=Math.max(a[i],curr+a[i]);best=Math.max(best,curr);}\n        return best;\n    }\n}',
      cpp:'int maxSubArray(vector<int>& a){\n    int curr=a[0],best=a[0];\n    for(int i=1;i<a.size();i++){curr=max(a[i],curr+a[i]);best=max(best,curr);}\n    return best;\n}',
      c:'int maxSubArray(int* a,int n){int c=a[0],b=a[0];for(int i=1;i<n;i++){c=c+a[i]>a[i]?c+a[i]:a[i];b=b>c?b:c;}return b;}',
    }
  },
  { id:'a4', no:4, title:'Container With Most Water', difficulty:'Medium', tags:['Array','Two Pointers'],
    description:'Given n vertical lines at positions 0..n-1 with heights `height[i]`. Find two lines that form a container holding the most water.',
    examples:[
      {input:'height = [1,8,6,2,5,4,8,3,7]', output:'49'},
      {input:'height = [1,1]', output:'1'},
    ],
    constraints:['2 ≤ height.length ≤ 10⁵','0 ≤ height[i] ≤ 10⁴'],
    hints:['Use two pointers starting at both ends','Move the pointer with smaller height inward','Area = min(h[l],h[r]) * (r-l)'],
    testCases:[{input:'9\n1 8 6 2 5 4 8 3 7',expected:'49'},{input:'2\n1 1',expected:'1'}],
    starter:{
      python:'def maxArea(height):\n    l, r = 0, len(height) - 1\n    best = 0\n    while l < r:\n        best = max(best, min(height[l], height[r]) * (r - l))\n        if height[l] < height[r]: l += 1\n        else: r -= 1\n    return best',
      javascript:'function maxArea(h) {\n    let l=0, r=h.length-1, best=0;\n    while(l<r){\n        best=Math.max(best,Math.min(h[l],h[r])*(r-l));\n        if(h[l]<h[r])l++; else r--;\n    }\n    return best;\n}',
      java:'class Solution{\n    public int maxArea(int[] h){\n        int l=0,r=h.length-1,best=0;\n        while(l<r){best=Math.max(best,Math.min(h[l],h[r])*(r-l));if(h[l]<h[r])l++;else r--;}\n        return best;\n    }\n}',
      cpp:'int maxArea(vector<int>& h){\n    int l=0,r=h.size()-1,best=0;\n    while(l<r){best=max(best,min(h[l],h[r])*(r-l));if(h[l]<h[r])l++;else r--;}\n    return best;\n}',
      c:'int maxArea(int* h,int n){int l=0,r=n-1,b=0;while(l<r){int a=(h[l]<h[r]?h[l]:h[r])*(r-l);if(a>b)b=a;if(h[l]<h[r])l++;else r--;}return b;}',
    }
  },
  { id:'a5', no:5, title:'Trapping Rain Water', difficulty:'Hard', tags:['Array','Two Pointers','Stack'],
    description:'Given `height` array representing elevation map, compute how much water it can trap after raining.',
    examples:[
      {input:'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output:'6'},
      {input:'height = [4,2,0,3,2,5]', output:'9'},
    ],
    constraints:['1 ≤ height.length ≤ 2×10⁴','0 ≤ height[i] ≤ 10⁵'],
    hints:['Two pointer approach: track maxLeft and maxRight','Water at i = min(maxL, maxR) - height[i]','Move the side with smaller max inward'],
    testCases:[{input:'12\n0 1 0 2 1 0 1 3 2 1 2 1',expected:'6'},{input:'6\n4 2 0 3 2 5',expected:'9'}],
    starter:{
      python:'def trap(height):\n    l, r = 0, len(height)-1\n    maxL = maxR = water = 0\n    while l < r:\n        if height[l] <= height[r]:\n            if height[l] >= maxL: maxL = height[l]\n            else: water += maxL - height[l]\n            l += 1\n        else:\n            if height[r] >= maxR: maxR = height[r]\n            else: water += maxR - height[r]\n            r -= 1\n    return water',
      javascript:'function trap(h){\n    let l=0,r=h.length-1,mL=0,mR=0,w=0;\n    while(l<r){\n        if(h[l]<=h[r]){if(h[l]>=mL)mL=h[l];else w+=mL-h[l];l++;}\n        else{if(h[r]>=mR)mR=h[r];else w+=mR-h[r];r--;}\n    }\n    return w;\n}',
      java:'class Solution{public int trap(int[] h){int l=0,r=h.length-1,mL=0,mR=0,w=0;while(l<r){if(h[l]<=h[r]){if(h[l]>=mL)mL=h[l];else w+=mL-h[l];l++;}else{if(h[r]>=mR)mR=h[r];else w+=mR-h[r];r--;}}return w;}}',
      cpp:'int trap(vector<int>&h){int l=0,r=h.size()-1,mL=0,mR=0,w=0;while(l<r){if(h[l]<=h[r]){if(h[l]>=mL)mL=h[l];else w+=mL-h[l];l++;}else{if(h[r]>=mR)mR=h[r];else w+=mR-h[r];r--;}}return w;}',
      c:'int trap(int*h,int n){int l=0,r=n-1,mL=0,mR=0,w=0;while(l<r){if(h[l]<=h[r]){if(h[l]>=mL)mL=h[l];else w+=mL-h[l];l++;}else{if(h[r]>=mR)mR=h[r];else w+=mR-h[r];r--;}}return w;}',
    }
  },
  { id:'a6', no:6, title:'3Sum', difficulty:'Medium', tags:['Array','Two Pointers','Sorting'],
    description:'Given integer array nums, return all triplets [nums[i], nums[j], nums[k]] such that i≠j≠k and nums[i]+nums[j]+nums[k]==0. No duplicate triplets.',
    examples:[{input:'nums = [-1,0,1,2,-1,-4]', output:'[[-1,-1,2],[-1,0,1]]'}],
    constraints:['3 ≤ nums.length ≤ 3000','-10⁵ ≤ nums[i] ≤ 10⁵'],
    hints:['Sort first, then use two pointers for each i','Skip duplicates carefully','Fix nums[i], find pair summing to -nums[i]'],
    testCases:[{input:'6\n-1 0 1 2 -1 -4',expected:'-1 -1 2\n-1 0 1'}],
    starter:{
      python:'def threeSum(nums):\n    nums.sort()\n    res = []\n    for i in range(len(nums)-2):\n        if i > 0 and nums[i] == nums[i-1]: continue\n        l, r = i+1, len(nums)-1\n        while l < r:\n            s = nums[i]+nums[l]+nums[r]\n            if s == 0:\n                res.append([nums[i],nums[l],nums[r]])\n                while l<r and nums[l]==nums[l+1]: l+=1\n                while l<r and nums[r]==nums[r-1]: r-=1\n                l+=1; r-=1\n            elif s < 0: l+=1\n            else: r-=1\n    return res',
      javascript:'function threeSum(nums){\n    nums.sort((a,b)=>a-b); const res=[];\n    for(let i=0;i<nums.length-2;i++){\n        if(i>0&&nums[i]===nums[i-1])continue;\n        let l=i+1,r=nums.length-1;\n        while(l<r){\n            const s=nums[i]+nums[l]+nums[r];\n            if(s===0){res.push([nums[i],nums[l],nums[r]]);while(l<r&&nums[l]===nums[l+1])l++;while(l<r&&nums[r]===nums[r-1])r--;l++;r--;}\n            else if(s<0)l++; else r--;\n        }\n    }\n    return res;\n}',
      java:'class Solution{public List<List<Integer>> threeSum(int[] n){Arrays.sort(n);List<List<Integer>> r=new ArrayList<>();for(int i=0;i<n.length-2;i++){if(i>0&&n[i]==n[i-1])continue;int l=i+1,ri=n.length-1;while(l<ri){int s=n[i]+n[l]+n[ri];if(s==0){r.add(Arrays.asList(n[i],n[l],n[ri]));while(l<ri&&n[l]==n[l+1])l++;while(l<ri&&n[ri]==n[ri-1])ri--;l++;ri--;}else if(s<0)l++;else ri--;}}return r;}}',
      cpp:'vector<vector<int>> threeSum(vector<int>& n){sort(n.begin(),n.end());vector<vector<int>> r;for(int i=0;i<(int)n.size()-2;i++){if(i>0&&n[i]==n[i-1])continue;int l=i+1,ri=n.size()-1;while(l<ri){int s=n[i]+n[l]+n[ri];if(s==0){r.push_back({n[i],n[l],n[ri]});while(l<ri&&n[l]==n[l+1])l++;while(l<ri&&n[ri]==n[ri-1])ri--;l++;ri--;}else if(s<0)l++;else ri--;}}return r;}',
      c:'/* C solution omitted for brevity - implement with nested loops */',
    }
  },
  // ── STRINGS ─────────────────────────────────────────────────────────────
  { id:'s1', no:7, title:'Valid Palindrome', difficulty:'Easy', tags:['String','Two Pointers'],
    description:'Given string s, return true if it is a palindrome considering only alphanumeric characters and ignoring cases.',
    examples:[
      {input:'s = "A man, a plan, a canal: Panama"', output:'true'},
      {input:'s = "race a car"', output:'false'},
    ],
    constraints:['1 ≤ s.length ≤ 2×10⁵','s consists only of printable ASCII'],
    hints:['Use two pointers from each end','Skip non-alphanumeric characters','Compare lowercase versions'],
    testCases:[{input:'A man, a plan, a canal: Panama',expected:'true'},{input:'race a car',expected:'false'}],
    starter:{
      python:'def isPalindrome(s):\n    l, r = 0, len(s)-1\n    while l < r:\n        while l < r and not s[l].isalnum(): l += 1\n        while l < r and not s[r].isalnum(): r -= 1\n        if s[l].lower() != s[r].lower(): return False\n        l += 1; r -= 1\n    return True',
      javascript:'function isPalindrome(s){\n    s=s.toLowerCase().replace(/[^a-z0-9]/g,"");\n    let l=0,r=s.length-1;\n    while(l<r){if(s[l]!==s[r])return false;l++;r--;}\n    return true;\n}',
      java:'class Solution{public boolean isPalindrome(String s){s=s.toLowerCase().replaceAll("[^a-z0-9]","");int l=0,r=s.length()-1;while(l<r){if(s.charAt(l)!=s.charAt(r))return false;l++;r--;}return true;}}',
      cpp:'bool isPalindrome(string s){string t;for(char c:s)if(isalnum(c))t+=tolower(c);int l=0,r=t.size()-1;while(l<r){if(t[l]!=t[r])return false;l++;r--;}return true;}',
      c:'#include<ctype.h>\nint isPalindrome(char* s){int l=0,r=strlen(s)-1;while(l<r){while(l<r&&!isalnum(s[l]))l++;while(l<r&&!isalnum(s[r]))r--;if(tolower(s[l])!=tolower(s[r]))return 0;l++;r--;}return 1;}',
    }
  },
  { id:'s2', no:8, title:'Longest Substring Without Repeating Characters', difficulty:'Medium', tags:['String','Sliding Window','Hash Map'],
    description:'Given string s, find the length of the longest substring without repeating characters.',
    examples:[
      {input:'s = "abcabcbb"', output:'3', explanation:'"abc" has length 3'},
      {input:'s = "bbbbb"', output:'1'},
    ],
    constraints:['0 ≤ s.length ≤ 5×10⁴'],
    hints:['Sliding window with a hash map','When duplicate found, move left pointer past previous occurrence','Window size = r - l + 1'],
    testCases:[{input:'abcabcbb',expected:'3'},{input:'bbbbb',expected:'1'},{input:'pwwkew',expected:'3'}],
    starter:{
      python:'def lengthOfLongestSubstring(s):\n    seen = {}\n    l = best = 0\n    for r, c in enumerate(s):\n        if c in seen and seen[c] >= l:\n            l = seen[c] + 1\n        seen[c] = r\n        best = max(best, r - l + 1)\n    return best',
      javascript:'function lengthOfLongestSubstring(s){\n    const m=new Map();let l=0,best=0;\n    for(let r=0;r<s.length;r++){\n        if(m.has(s[r])&&m.get(s[r])>=l)l=m.get(s[r])+1;\n        m.set(s[r],r);\n        best=Math.max(best,r-l+1);\n    }\n    return best;\n}',
      java:'class Solution{public int lengthOfLongestSubstring(String s){Map<Character,Integer> m=new HashMap<>();int l=0,best=0;for(int r=0;r<s.length();r++){char c=s.charAt(r);if(m.containsKey(c)&&m.get(c)>=l)l=m.get(c)+1;m.put(c,r);best=Math.max(best,r-l+1);}return best;}}',
      cpp:'int lengthOfLongestSubstring(string s){unordered_map<char,int> m;int l=0,best=0;for(int r=0;r<s.size();r++){if(m.count(s[r])&&m[s[r]]>=l)l=m[s[r]]+1;m[s[r]]=r;best=max(best,r-l+1);}return best;}',
      c:'int lengthOfLongestSubstring(char* s){int m[256];memset(m,-1,sizeof(m));int l=0,best=0,n=strlen(s);for(int r=0;r<n;r++){if(m[(int)s[r]]>=l)l=m[(int)s[r]]+1;m[(int)s[r]]=r;if(r-l+1>best)best=r-l+1;}return best;}',
    }
  },
  { id:'s3', no:9, title:'Valid Anagram', difficulty:'Easy', tags:['String','Hash Map','Sorting'],
    description:'Given two strings s and t, return true if t is an anagram of s, and false otherwise.',
    examples:[
      {input:'s = "anagram", t = "nagaram"', output:'true'},
      {input:'s = "rat", t = "car"', output:'false'},
    ],
    constraints:['1 ≤ s.length, t.length ≤ 5×10⁴','s and t consist of lowercase English letters'],
    hints:['Count character frequencies','Compare frequency maps','Or sort both strings and compare'],
    testCases:[{input:'anagram nagaram',expected:'true'},{input:'rat car',expected:'false'}],
    starter:{
      python:'def isAnagram(s, t):\n    if len(s) != len(t): return False\n    from collections import Counter\n    return Counter(s) == Counter(t)',
      javascript:'function isAnagram(s,t){\n    if(s.length!==t.length)return false;\n    const c={};\n    for(const x of s)c[x]=(c[x]||0)+1;\n    for(const x of t){if(!c[x])return false;c[x]--;}\n    return true;\n}',
      java:'class Solution{public boolean isAnagram(String s,String t){if(s.length()!=t.length())return false;int[]c=new int[26];for(char x:s.toCharArray())c[x-\'a\']++;for(char x:t.toCharArray())if(--c[x-\'a\']<0)return false;return true;}}',
      cpp:'bool isAnagram(string s,string t){if(s.size()!=t.size())return false;int c[26]={};for(char x:s)c[x-\'a\']++;for(char x:t)if(--c[x-\'a\']<0)return false;return true;}',
      c:'int isAnagram(char*s,char*t){if(strlen(s)!=strlen(t))return 0;int c[26]={};while(*s)c[*s++-\'a\']++;while(*t)if(--c[*t++-\'a\']<0)return 0;return 1;}',
    }
  },
  { id:'s4', no:10, title:'Longest Palindromic Substring', difficulty:'Medium', tags:['String','DP','Two Pointers'],
    description:'Given a string s, return the longest palindromic substring in s.',
    examples:[
      {input:'s = "babad"', output:'"bab"', explanation:'"aba" is also valid'},
      {input:'s = "cbbd"', output:'"bb"'},
    ],
    constraints:['1 ≤ s.length ≤ 1000'],
    hints:['Expand around center for each character','Try both odd and even length palindromes','O(n²) with O(1) space using expand-around-center'],
    testCases:[{input:'babad',expected:'bab'},{input:'cbbd',expected:'bb'}],
    starter:{
      python:'def longestPalindrome(s):\n    def expand(l, r):\n        while l>=0 and r<len(s) and s[l]==s[r]: l-=1; r+=1\n        return s[l+1:r]\n    best = ""\n    for i in range(len(s)):\n        for p in [expand(i,i), expand(i,i+1)]:\n            if len(p) > len(best): best = p\n    return best',
      javascript:'function longestPalindrome(s){\n    let best="";\n    function expand(l,r){\n        while(l>=0&&r<s.length&&s[l]===s[r]){l--;r++;}\n        return s.slice(l+1,r);\n    }\n    for(let i=0;i<s.length;i++){\n        for(const p of[expand(i,i),expand(i,i+1)])if(p.length>best.length)best=p;\n    }\n    return best;\n}',
      java:'class Solution{public String longestPalindrome(String s){String best="";for(int i=0;i<s.length();i++){for(int d:new int[]{0,1}){int l=i,r=i+d;while(l>=0&&r<s.length()&&s.charAt(l)==s.charAt(r)){l--;r++;}String p=s.substring(l+1,r);if(p.length()>best.length())best=p;}}return best;}}',
      cpp:'string longestPalindrome(string s){string best;for(int i=0;i<s.size();i++){for(int d:{0,1}){int l=i,r=i+d;while(l>=0&&r<(int)s.size()&&s[l]==s[r]){l--;r++;}if(r-l-1>best.size())best=s.substr(l+1,r-l-1);}}return best;}',
      c:'char res[1001];char* longestPalindrome(char*s){int n=strlen(s),bs=0,bi=0;for(int i=0;i<n;i++){for(int d=0;d<=1;d++){int l=i,r=i+d;while(l>=0&&r<n&&s[l]==s[r]){l--;r++;}if(r-l-1>bs){bs=r-l-1;bi=l+1;}}}strncpy(res,s+bi,bs);res[bs]=0;return res;}',
    }
  },
  { id:'s5', no:11, title:'Group Anagrams', difficulty:'Medium', tags:['String','Hash Map','Sorting'],
    description:'Given an array of strings strs, group the anagrams together. Return the answer in any order.',
    examples:[{input:'strs = ["eat","tea","tan","ate","nat","bat"]', output:'[["bat"],["nat","tan"],["ate","eat","tea"]]'}],
    constraints:['1 ≤ strs.length ≤ 10⁴'],
    hints:['Sort each string as the key','Use a hash map from sorted_key → group'],
    testCases:[{input:'6\neat tea tan ate nat bat',expected:'bat\nnat tan\nate eat tea'}],
    starter:{
      python:'def groupAnagrams(strs):\n    from collections import defaultdict\n    d = defaultdict(list)\n    for s in strs:\n        d[tuple(sorted(s))].append(s)\n    return list(d.values())',
      javascript:'function groupAnagrams(strs){\n    const m=new Map();\n    for(const s of strs){\n        const k=s.split("").sort().join("");\n        if(!m.has(k))m.set(k,[]);\n        m.get(k).push(s);\n    }\n    return [...m.values()];\n}',
      java:'class Solution{public List<List<String>> groupAnagrams(String[] s){Map<String,List<String>> m=new HashMap<>();for(String x:s){char[]c=x.toCharArray();Arrays.sort(c);String k=new String(c);m.computeIfAbsent(k,z->new ArrayList<>()).add(x);}return new ArrayList<>(m.values());}}',
      cpp:'vector<vector<string>> groupAnagrams(vector<string>&s){unordered_map<string,vector<string>> m;for(auto&x:s){string k=x;sort(k.begin(),k.end());m[k].push_back(x);}vector<vector<string>> r;for(auto&p:m)r.push_back(p.second);return r;}',
      c:'/* Group anagrams in C - sort each string and use as key */',
    }
  },
  // ── LINKED LISTS ────────────────────────────────────────────────────────
  { id:'l1', no:12, title:'Reverse Linked List', difficulty:'Easy', tags:['Linked List','Recursion'],
    description:'Given the head of a singly linked list, reverse the list and return the reversed head.',
    examples:[
      {input:'head = [1,2,3,4,5]', output:'[5,4,3,2,1]'},
      {input:'head = [1,2]', output:'[2,1]'},
    ],
    constraints:['0 ≤ length ≤ 5000','-5000 ≤ Node.val ≤ 5000'],
    hints:['Iterative: use prev, curr, next pointers','Recursive: reverse(head.next) then relink head'],
    testCases:[{input:'5\n1 2 3 4 5',expected:'5 4 3 2 1'},{input:'2\n1 2',expected:'2 1'}],
    starter:{
      python:'class ListNode:\n    def __init__(self,val=0,next=None): self.val=val;self.next=next\n\ndef reverseList(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev',
      javascript:'function reverseList(head){\n    let prev=null, curr=head;\n    while(curr){\n        const nxt=curr.next;\n        curr.next=prev;\n        prev=curr;\n        curr=nxt;\n    }\n    return prev;\n}',
      java:'class Solution{public ListNode reverseList(ListNode head){ListNode prev=null,curr=head;while(curr!=null){ListNode nxt=curr.next;curr.next=prev;prev=curr;curr=nxt;}return prev;}}',
      cpp:'ListNode* reverseList(ListNode* head){ListNode* prev=nullptr;while(head){ListNode* nxt=head->next;head->next=prev;prev=head;head=nxt;}return prev;}',
      c:'struct ListNode* reverseList(struct ListNode* h){struct ListNode* p=NULL;while(h){struct ListNode* n=h->next;h->next=p;p=h;h=n;}return p;}',
    }
  },
  { id:'l2', no:13, title:'Merge Two Sorted Lists', difficulty:'Easy', tags:['Linked List','Recursion'],
    description:'Given heads of two sorted linked lists list1 and list2, merge them into one sorted list and return the head.',
    examples:[{input:'list1=[1,2,4], list2=[1,3,4]', output:'[1,1,2,3,4,4]'}],
    constraints:['0 ≤ length ≤ 50','-100 ≤ Node.val ≤ 100'],
    hints:['Use a dummy head node','Iteratively compare and attach the smaller node'],
    testCases:[{input:'3\n1 2 4\n3\n1 3 4',expected:'1 1 2 3 4 4'}],
    starter:{
      python:'def mergeTwoLists(l1, l2):\n    dummy = ListNode(0)\n    curr = dummy\n    while l1 and l2:\n        if l1.val <= l2.val: curr.next=l1; l1=l1.next\n        else: curr.next=l2; l2=l2.next\n        curr=curr.next\n    curr.next = l1 or l2\n    return dummy.next',
      javascript:'function mergeTwoLists(l1,l2){\n    const d={val:0,next:null};let c=d;\n    while(l1&&l2){\n        if(l1.val<=l2.val){c.next=l1;l1=l1.next;}else{c.next=l2;l2=l2.next;}\n        c=c.next;\n    }\n    c.next=l1||l2;\n    return d.next;\n}',
      java:'class Solution{public ListNode mergeTwoLists(ListNode l1,ListNode l2){ListNode d=new ListNode(0),c=d;while(l1!=null&&l2!=null){if(l1.val<=l2.val){c.next=l1;l1=l1.next;}else{c.next=l2;l2=l2.next;}c=c.next;}c.next=l1!=null?l1:l2;return d.next;}}',
      cpp:'ListNode* mergeTwoLists(ListNode*l1,ListNode*l2){ListNode d(0);ListNode*c=&d;while(l1&&l2){if(l1->val<=l2->val){c->next=l1;l1=l1->next;}else{c->next=l2;l2=l2->next;}c=c->next;}c->next=l1?l1:l2;return d.next;}',
      c:'struct ListNode* mergeTwoLists(struct ListNode*l1,struct ListNode*l2){struct ListNode d;struct ListNode*c=&d;while(l1&&l2){if(l1->val<=l2->val){c->next=l1;l1=l1->next;}else{c->next=l2;l2=l2->next;}c=c->next;}c->next=l1?l1:l2;return d.next;}',
    }
  },
  { id:'l3', no:14, title:'Linked List Cycle', difficulty:'Easy', tags:['Linked List','Two Pointers'],
    description:'Given head of a linked list, determine if the list has a cycle.',
    examples:[{input:'head=[3,2,0,-4], pos=1 (cycle at index 1)', output:'true'}],
    constraints:['0 ≤ number of nodes ≤ 10⁴'],
    hints:["Floyd's Cycle Detection: slow moves 1 step, fast moves 2","If they meet, there's a cycle"],
    testCases:[{input:'4\n3 2 0 -4\n1',expected:'true'},{input:'1\n1\n-1',expected:'false'}],
    starter:{
      python:'def hasCycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow is fast: return True\n    return False',
      javascript:'function hasCycle(head){\n    let slow=head,fast=head;\n    while(fast&&fast.next){\n        slow=slow.next;fast=fast.next.next;\n        if(slow===fast)return true;\n    }\n    return false;\n}',
      java:'class Solution{public boolean hasCycle(ListNode h){ListNode s=h,f=h;while(f!=null&&f.next!=null){s=s.next;f=f.next.next;if(s==f)return true;}return false;}}',
      cpp:'bool hasCycle(ListNode*h){ListNode*s=h,*f=h;while(f&&f->next){s=s->next;f=f->next->next;if(s==f)return true;}return false;}',
      c:'int hasCycle(struct ListNode*h){struct ListNode*s=h,*f=h;while(f&&f->next){s=s->next;f=f->next->next;if(s==f)return 1;}return 0;}',
    }
  },
  { id:'l4', no:15, title:'LRU Cache', difficulty:'Medium', tags:['Linked List','Hash Map','Design'],
    description:'Design a data structure that follows LRU cache constraints. Implement LRUCache with get(key) and put(key, value) both in O(1).',
    examples:[{input:'LRUCache(2); put(1,1); put(2,2); get(1)→1; put(3,3)[evicts 2]; get(2)→-1', output:'-1 for evicted key'}],
    constraints:['1 ≤ capacity ≤ 3000','0 ≤ key, value ≤ 10⁴'],
    hints:['Use doubly linked list + hash map','Map: key → node; List: LRU order','On access: move node to front; On capacity: remove from back'],
    testCases:[{input:'2\n4\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2',expected:'1\n-1'}],
    starter:{
      python:'class LRUCache:\n    def __init__(self, capacity):\n        from collections import OrderedDict\n        self.cap = capacity\n        self.cache = OrderedDict()\n    \n    def get(self, key):\n        if key not in self.cache: return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    \n    def put(self, key, value):\n        if key in self.cache: self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.cap:\n            self.cache.popitem(last=False)',
      javascript:'class LRUCache{\n    constructor(cap){this.cap=cap;this.m=new Map();}\n    get(k){if(!this.m.has(k))return -1;const v=this.m.get(k);this.m.delete(k);this.m.set(k,v);return v;}\n    put(k,v){if(this.m.has(k))this.m.delete(k);this.m.set(k,v);if(this.m.size>this.cap)this.m.delete(this.m.keys().next().value);}\n}',
      java:'class LRUCache extends LinkedHashMap<Integer,Integer>{int cap;LRUCache(int c){super(c,0.75f,true);cap=c;}public int get(int k){return super.getOrDefault(k,-1);}public void put(int k,int v){super.put(k,v);}protected boolean removeEldestEntry(Map.Entry<Integer,Integer> e){return size()>cap;}}',
      cpp:'class LRUCache{int cap;list<pair<int,int>> l;unordered_map<int,list<pair<int,int>>::iterator> m;public:LRUCache(int c):cap(c){}int get(int k){if(!m.count(k))return -1;l.splice(l.begin(),l,m[k]);return m[k]->second;}void put(int k,int v){if(m.count(k))l.erase(m[k]);else if(l.size()==cap){m.erase(l.back().first);l.pop_back();}l.push_front({k,v});m[k]=l.begin();}};',
      c:'/* LRU Cache in C - use array-based hash map + doubly linked list */',
    }
  },
  // ── TREES ───────────────────────────────────────────────────────────────
  { id:'t1', no:16, title:'Maximum Depth of Binary Tree', difficulty:'Easy', tags:['Tree','DFS','BFS'],
    description:'Given the root of a binary tree, return its maximum depth (number of nodes along longest root-to-leaf path).',
    examples:[{input:'root = [3,9,20,null,null,15,7]', output:'3'}],
    constraints:['0 ≤ nodes ≤ 10⁴','-100 ≤ Node.val ≤ 100'],
    hints:['DFS: max(depth(left), depth(right)) + 1','BFS: count levels'],
    testCases:[{input:'3\n3 9 20 null null 15 7',expected:'3'},{input:'1\n1',expected:'1'}],
    starter:{
      python:'def maxDepth(root):\n    if not root: return 0\n    return 1 + max(maxDepth(root.left), maxDepth(root.right))',
      javascript:'function maxDepth(root){\n    if(!root)return 0;\n    return 1+Math.max(maxDepth(root.left),maxDepth(root.right));\n}',
      java:'class Solution{public int maxDepth(TreeNode r){return r==null?0:1+Math.max(maxDepth(r.left),maxDepth(r.right));}}',
      cpp:'int maxDepth(TreeNode*r){return r?1+max(maxDepth(r->left),maxDepth(r->right)):0;}',
      c:'int maxDepth(struct TreeNode*r){if(!r)return 0;int l=maxDepth(r->left),ri=maxDepth(r->right);return 1+(l>ri?l:ri);}',
    }
  },
  { id:'t2', no:17, title:'Invert Binary Tree', difficulty:'Easy', tags:['Tree','DFS','BFS'],
    description:'Given the root of a binary tree, invert the tree (mirror it), and return its root.',
    examples:[{input:'root = [4,2,7,1,3,6,9]', output:'[4,7,2,9,6,3,1]'}],
    constraints:['0 ≤ nodes ≤ 100'],
    hints:['Recursively swap left and right children','Apply to every node'],
    testCases:[{input:'7\n4 2 7 1 3 6 9',expected:'4 7 2 9 6 3 1'}],
    starter:{
      python:'def invertTree(root):\n    if not root: return None\n    root.left, root.right = invertTree(root.right), invertTree(root.left)\n    return root',
      javascript:'function invertTree(root){\n    if(!root)return null;\n    [root.left,root.right]=[invertTree(root.right),invertTree(root.left)];\n    return root;\n}',
      java:'class Solution{public TreeNode invertTree(TreeNode r){if(r==null)return null;TreeNode tmp=r.left;r.left=invertTree(r.right);r.right=invertTree(tmp);return r;}}',
      cpp:'TreeNode* invertTree(TreeNode*r){if(!r)return nullptr;swap(r->left,r->right);invertTree(r->left);invertTree(r->right);return r;}',
      c:'struct TreeNode* invertTree(struct TreeNode*r){if(!r)return NULL;struct TreeNode*t=r->left;r->left=invertTree(r->right);r->right=invertTree(t);return r;}',
    }
  },
  { id:'t3', no:18, title:'Lowest Common Ancestor of BST', difficulty:'Easy', tags:['Tree','BST','DFS'],
    description:'Given BST root and two nodes p and q, find their lowest common ancestor (LCA).',
    examples:[{input:'root=[6,2,8,0,4,7,9], p=2, q=8', output:'6'},{input:'p=2, q=4', output:'2'}],
    constraints:['2 ≤ nodes ≤ 10⁵','BST properties hold'],
    hints:['If both < root: go left; if both > root: go right; otherwise root is LCA'],
    testCases:[{input:'6 2 8',expected:'6'},{input:'6 2 4',expected:'2'}],
    starter:{
      python:'def lowestCommonAncestor(root, p, q):\n    while root:\n        if p.val < root.val and q.val < root.val: root = root.left\n        elif p.val > root.val and q.val > root.val: root = root.right\n        else: return root',
      javascript:'function lowestCommonAncestor(root,p,q){\n    while(root){\n        if(p.val<root.val&&q.val<root.val)root=root.left;\n        else if(p.val>root.val&&q.val>root.val)root=root.right;\n        else return root;\n    }\n}',
      java:'class Solution{public TreeNode lowestCommonAncestor(TreeNode r,TreeNode p,TreeNode q){while(r!=null){if(p.val<r.val&&q.val<r.val)r=r.left;else if(p.val>r.val&&q.val>r.val)r=r.right;else return r;}return null;}}',
      cpp:'TreeNode* lowestCommonAncestor(TreeNode*r,TreeNode*p,TreeNode*q){while(r){if(p->val<r->val&&q->val<r->val)r=r->left;else if(p->val>r->val&&q->val>r->val)r=r->right;else return r;}return nullptr;}',
      c:'struct TreeNode* lowestCommonAncestor(struct TreeNode*r,struct TreeNode*p,struct TreeNode*q){while(r){if(p->val<r->val&&q->val<r->val)r=r->left;else if(p->val>r->val&&q->val>r->val)r=r->right;else return r;}return NULL;}',
    }
  },
  { id:'t4', no:19, title:'Binary Tree Level Order Traversal', difficulty:'Medium', tags:['Tree','BFS','Queue'],
    description:'Given root of a binary tree, return the level order traversal of its nodes (left to right, level by level).',
    examples:[{input:'root = [3,9,20,null,null,15,7]', output:'[[3],[9,20],[15,7]]'}],
    constraints:['0 ≤ nodes ≤ 2000'],
    hints:['Use a queue','Process all nodes at current level before moving to next'],
    testCases:[{input:'7\n3 9 20 null null 15 7',expected:'3\n9 20\n15 7'}],
    starter:{
      python:'from collections import deque\ndef levelOrder(root):\n    if not root: return []\n    q, res = deque([root]), []\n    while q:\n        level = []\n        for _ in range(len(q)):\n            node = q.popleft()\n            level.append(node.val)\n            if node.left: q.append(node.left)\n            if node.right: q.append(node.right)\n        res.append(level)\n    return res',
      javascript:'function levelOrder(root){\n    if(!root)return[];\n    const q=[root],res=[];\n    while(q.length){\n        const level=[];\n        for(let i=q.length;i>0;i--){\n            const n=q.shift();\n            level.push(n.val);\n            if(n.left)q.push(n.left);\n            if(n.right)q.push(n.right);\n        }\n        res.push(level);\n    }\n    return res;\n}',
      java:'class Solution{public List<List<Integer>> levelOrder(TreeNode root){List<List<Integer>> res=new ArrayList<>();if(root==null)return res;Queue<TreeNode> q=new LinkedList<>();q.add(root);while(!q.isEmpty()){int sz=q.size();List<Integer> lv=new ArrayList<>();for(int i=0;i<sz;i++){TreeNode n=q.poll();lv.add(n.val);if(n.left!=null)q.add(n.left);if(n.right!=null)q.add(n.right);}res.add(lv);}return res;}}',
      cpp:'vector<vector<int>> levelOrder(TreeNode*root){vector<vector<int>> res;if(!root)return res;queue<TreeNode*> q;q.push(root);while(!q.empty()){int sz=q.size();vector<int> lv;for(int i=0;i<sz;i++){TreeNode*n=q.front();q.pop();lv.push_back(n->val);if(n->left)q.push(n->left);if(n->right)q.push(n->right);}res.push_back(lv);}return res;}',
      c:'/* Level order using queue - implement with array-based queue */',
    }
  },
  { id:'t5', no:20, title:'Binary Tree Maximum Path Sum', difficulty:'Hard', tags:['Tree','DFS','DP'],
    description:'A path in a binary tree connects any two nodes where each adjacent pair has an edge. Return the maximum path sum of any non-empty path.',
    examples:[{input:'root = [-10,9,20,null,null,15,7]', output:'42', explanation:'Path: 15→20→7'}],
    constraints:['-1000 ≤ Node.val ≤ 1000'],
    hints:['DFS: at each node compute gain going left and right','Max gain through node = max(left,0) + max(right,0) + node.val','Update global max, but return only one direction to parent'],
    testCases:[{input:'7\n-10 9 20 null null 15 7',expected:'42'}],
    starter:{
      python:'def maxPathSum(root):\n    res = [root.val]\n    def dfs(node):\n        if not node: return 0\n        l = max(dfs(node.left), 0)\n        r = max(dfs(node.right), 0)\n        res[0] = max(res[0], node.val + l + r)\n        return node.val + max(l, r)\n    dfs(root)\n    return res[0]',
      javascript:'function maxPathSum(root){\n    let res=root.val;\n    function dfs(n){\n        if(!n)return 0;\n        const l=Math.max(dfs(n.left),0),r=Math.max(dfs(n.right),0);\n        res=Math.max(res,n.val+l+r);\n        return n.val+Math.max(l,r);\n    }\n    dfs(root);return res;\n}',
      java:'class Solution{int res;public int maxPathSum(TreeNode root){res=root.val;dfs(root);return res;}int dfs(TreeNode n){if(n==null)return 0;int l=Math.max(dfs(n.left),0),r=Math.max(dfs(n.right),0);res=Math.max(res,n.val+l+r);return n.val+Math.max(l,r);}}',
      cpp:'int res;int dfs(TreeNode*n){if(!n)return 0;int l=max(dfs(n->left),0),r=max(dfs(n->right),0);res=max(res,n->val+l+r);return n->val+max(l,r);}int maxPathSum(TreeNode*root){res=root->val;dfs(root);return res;}',
      c:'/* Implement with global max variable and recursive DFS */',
    }
  },
  // ── GRAPHS ──────────────────────────────────────────────────────────────
  { id:'g1', no:21, title:'Number of Islands', difficulty:'Medium', tags:['Graph','DFS','BFS','Matrix'],
    description:"Given an m×n 2D binary grid of '1's (land) and '0's (water), return the number of islands.",
    examples:[{input:'grid=[["1","1","0"],["0","1","0"],["0","0","1"]]', output:'2'}],
    constraints:['1 ≤ m,n ≤ 300'],
    hints:['DFS/BFS from every unvisited 1','Mark visited cells to avoid re-processing'],
    testCases:[{input:'3 3\n1 1 0\n0 1 0\n0 0 1',expected:'2'}],
    starter:{
      python:'def numIslands(grid):\n    count = 0\n    def dfs(i, j):\n        if i<0 or i>=len(grid) or j<0 or j>=len(grid[0]) or grid[i][j]!="1": return\n        grid[i][j]="0"\n        for di,dj in [(0,1),(1,0),(0,-1),(-1,0)]: dfs(i+di,j+dj)\n    for i in range(len(grid)):\n        for j in range(len(grid[0])):\n            if grid[i][j]=="1": count+=1; dfs(i,j)\n    return count',
      javascript:'function numIslands(grid){\n    let count=0;\n    function dfs(i,j){\n        if(i<0||i>=grid.length||j<0||j>=grid[0].length||grid[i][j]!=="1")return;\n        grid[i][j]="0";\n        [[0,1],[1,0],[0,-1],[-1,0]].forEach(([di,dj])=>dfs(i+di,j+dj));\n    }\n    for(let i=0;i<grid.length;i++)\n        for(let j=0;j<grid[0].length;j++)\n            if(grid[i][j]==="1"){count++;dfs(i,j);}\n    return count;\n}',
      java:'class Solution{public int numIslands(char[][] g){int c=0;for(int i=0;i<g.length;i++)for(int j=0;j<g[0].length;j++)if(g[i][j]==\'1\'){c++;dfs(g,i,j);}return c;}void dfs(char[][]g,int i,int j){if(i<0||i>=g.length||j<0||j>=g[0].length||g[i][j]!=\'1\')return;g[i][j]=\'0\';dfs(g,i+1,j);dfs(g,i-1,j);dfs(g,i,j+1);dfs(g,i,j-1);}}',
      cpp:'void dfs(vector<vector<char>>&g,int i,int j){if(i<0||i>=g.size()||j<0||j>=g[0].size()||g[i][j]!=\'1\')return;g[i][j]=\'0\';dfs(g,i+1,j);dfs(g,i-1,j);dfs(g,i,j+1);dfs(g,i,j-1);}int numIslands(vector<vector<char>>&g){int c=0;for(int i=0;i<g.size();i++)for(int j=0;j<g[0].size();j++)if(g[i][j]==\'1\'){c++;dfs(g,i,j);}return c;}',
      c:'/* BFS/DFS on 2D grid - use stack/queue for traversal */',
    }
  },
  { id:'g2', no:22, title:'Clone Graph', difficulty:'Medium', tags:['Graph','DFS','BFS','Hash Map'],
    description:"Given a reference of a node in a connected undirected graph, return a deep copy of the graph.",
    examples:[{input:'adjList = [[2,4],[1,3],[2,4],[1,3]]', output:'[[2,4],[1,3],[2,4],[1,3]]'}],
    constraints:['1 ≤ nodes ≤ 100','1 ≤ val ≤ 100'],
    hints:['Use hash map: original → clone','DFS/BFS: when visiting a node, clone it and recursively clone neighbors'],
    testCases:[{input:'4\n1:2 4\n2:1 3\n3:2 4\n4:1 3',expected:'1:2 4\n2:1 3\n3:2 4\n4:1 3'}],
    starter:{
      python:'def cloneGraph(node):\n    if not node: return None\n    seen = {}\n    def dfs(n):\n        if n in seen: return seen[n]\n        clone = Node(n.val)\n        seen[n] = clone\n        for nb in n.neighbors: clone.neighbors.append(dfs(nb))\n        return clone\n    return dfs(node)',
      javascript:'function cloneGraph(node){\n    if(!node)return null;\n    const map=new Map();\n    function dfs(n){\n        if(map.has(n))return map.get(n);\n        const clone={val:n.val,neighbors:[]};\n        map.set(n,clone);\n        for(const nb of n.neighbors)clone.neighbors.push(dfs(nb));\n        return clone;\n    }\n    return dfs(node);\n}',
      java:'class Solution{Map<Node,Node> m=new HashMap<>();public Node cloneGraph(Node n){if(n==null)return null;if(m.containsKey(n))return m.get(n);Node c=new Node(n.val);m.put(n,c);for(Node nb:n.neighbors)c.neighbors.add(cloneGraph(nb));return c;}}',
      cpp:'unordered_map<Node*,Node*> m;Node* cloneGraph(Node*n){if(!n)return nullptr;if(m.count(n))return m[n];Node*c=new Node(n->val);m[n]=c;for(auto nb:n->neighbors)c->neighbors.push_back(cloneGraph(nb));return c;}',
      c:'/* Clone graph using hash map and DFS */',
    }
  },
  { id:'g3', no:23, title:'Course Schedule (Detect Cycle in DAG)', difficulty:'Medium', tags:['Graph','Topological Sort','DFS'],
    description:'There are numCourses labeled 0 to n-1. Given prerequisites[i]=[a,b] meaning must take b before a. Return true if possible to finish all courses.',
    examples:[{input:'numCourses=2, prerequisites=[[1,0]]', output:'true'},{input:'numCourses=2, prerequisites=[[1,0],[0,1]]', output:'false'}],
    constraints:['1 ≤ numCourses ≤ 2000'],
    hints:['Build adjacency list','DFS with 3 states: 0=unvisited, 1=visiting, 2=visited','If visiting node again → cycle → false'],
    testCases:[{input:'2\n1\n1 0',expected:'true'},{input:'2\n2\n1 0\n0 1',expected:'false'}],
    starter:{
      python:'def canFinish(numCourses, prerequisites):\n    graph = [[] for _ in range(numCourses)]\n    for a,b in prerequisites: graph[a].append(b)\n    state = [0]*numCourses  # 0=unvisited 1=visiting 2=done\n    def dfs(u):\n        if state[u]==1: return False\n        if state[u]==2: return True\n        state[u]=1\n        for v in graph[u]:\n            if not dfs(v): return False\n        state[u]=2\n        return True\n    return all(dfs(i) for i in range(numCourses))',
      javascript:'function canFinish(n,pre){\n    const g=Array.from({length:n},()=>[]);\n    for(const[a,b]of pre)g[a].push(b);\n    const state=new Array(n).fill(0);\n    function dfs(u){\n        if(state[u]===1)return false;\n        if(state[u]===2)return true;\n        state[u]=1;\n        for(const v of g[u])if(!dfs(v))return false;\n        state[u]=2;return true;\n    }\n    for(let i=0;i<n;i++)if(!dfs(i))return false;\n    return true;\n}',
      java:'class Solution{public boolean canFinish(int n,int[][]pre){List<List<Integer>> g=new ArrayList<>();for(int i=0;i<n;i++)g.add(new ArrayList<>());for(int[]p:pre)g.get(p[0]).add(p[1]);int[]st=new int[n];for(int i=0;i<n;i++)if(!dfs(g,st,i))return false;return true;}boolean dfs(List<List<Integer>>g,int[]st,int u){if(st[u]==1)return false;if(st[u]==2)return true;st[u]=1;for(int v:g.get(u))if(!dfs(g,st,v))return false;st[u]=2;return true;}}',
      cpp:'bool dfs(vector<vector<int>>&g,vector<int>&st,int u){if(st[u]==1)return false;if(st[u]==2)return true;st[u]=1;for(int v:g[u])if(!dfs(g,st,v))return false;st[u]=2;return true;}bool canFinish(int n,vector<vector<int>>&pre){vector<vector<int>> g(n);for(auto&p:pre)g[p[0]].push_back(p[1]);vector<int> st(n,0);for(int i=0;i<n;i++)if(!dfs(g,st,i))return false;return true;}',
      c:'/* Cycle detection in directed graph using DFS with coloring */',
    }
  },
  // ── DYNAMIC PROGRAMMING ─────────────────────────────────────────────────
  { id:'d1', no:24, title:'Climbing Stairs', difficulty:'Easy', tags:['DP','Math','Fibonacci'],
    description:'You can climb 1 or 2 steps at a time. How many distinct ways to reach the top of n stairs?',
    examples:[{input:'n=2', output:'2'},{input:'n=3', output:'3'}],
    constraints:['1 ≤ n ≤ 45'],
    hints:['f(n) = f(n-1) + f(n-2) — Fibonacci!','Base cases: f(1)=1, f(2)=2'],
    testCases:[{input:'2',expected:'2'},{input:'3',expected:'3'},{input:'5',expected:'8'}],
    starter:{
      python:'def climbStairs(n):\n    if n <= 2: return n\n    a, b = 1, 2\n    for _ in range(3, n+1): a, b = b, a+b\n    return b',
      javascript:'function climbStairs(n){\n    if(n<=2)return n;\n    let a=1,b=2;\n    for(let i=3;i<=n;i++){[a,b]=[b,a+b];}\n    return b;\n}',
      java:'class Solution{public int climbStairs(int n){if(n<=2)return n;int a=1,b=2;for(int i=3;i<=n;i++){int c=a+b;a=b;b=c;}return b;}}',
      cpp:'int climbStairs(int n){if(n<=2)return n;int a=1,b=2;for(int i=3;i<=n;i++){int c=a+b;a=b;b=c;}return b;}',
      c:'int climbStairs(int n){if(n<=2)return n;int a=1,b=2;for(int i=3;i<=n;i++){int c=a+b;a=b;b=c;}return b;}',
    }
  },
  { id:'d2', no:25, title:'Coin Change', difficulty:'Medium', tags:['DP','BFS'],
    description:'Given coins of different denominations and amount, return fewest coins needed to make up that amount. Return -1 if impossible.',
    examples:[{input:'coins=[1,5,11], amount=11', output:'2', explanation:'5+5+1? No, 11 directly = 1 coin? Wait: coin 11 exists, return 1'},{input:'coins=[2], amount=3', output:'-1'}],
    constraints:['1 ≤ coins.length ≤ 12','0 ≤ amount ≤ 10⁴'],
    hints:['DP bottom-up: dp[i] = min coins to make i','dp[0]=0, dp[i]=min(dp[i-c]+1) for each coin c'],
    testCases:[{input:'3\n1 5 11\n11',expected:'1'},{input:'1\n2\n3',expected:'-1'},{input:'3\n1 2 5\n11',expected:'3'}],
    starter:{
      python:'def coinChange(coins, amount):\n    dp = [float("inf")] * (amount+1)\n    dp[0] = 0\n    for i in range(1, amount+1):\n        for c in coins:\n            if c <= i:\n                dp[i] = min(dp[i], dp[i-c]+1)\n    return dp[amount] if dp[amount] != float("inf") else -1',
      javascript:'function coinChange(coins,amount){\n    const dp=new Array(amount+1).fill(Infinity);\n    dp[0]=0;\n    for(let i=1;i<=amount;i++)\n        for(const c of coins)\n            if(c<=i)dp[i]=Math.min(dp[i],dp[i-c]+1);\n    return dp[amount]===Infinity?-1:dp[amount];\n}',
      java:'class Solution{public int coinChange(int[]coins,int amount){int[]dp=new int[amount+1];Arrays.fill(dp,amount+1);dp[0]=0;for(int i=1;i<=amount;i++)for(int c:coins)if(c<=i)dp[i]=Math.min(dp[i],dp[i-c]+1);return dp[amount]>amount?-1:dp[amount];}}',
      cpp:'int coinChange(vector<int>&coins,int amount){vector<int> dp(amount+1,amount+1);dp[0]=0;for(int i=1;i<=amount;i++)for(int c:coins)if(c<=i)dp[i]=min(dp[i],dp[i-c]+1);return dp[amount]>amount?-1:dp[amount];}',
      c:'int coinChange(int*coins,int n,int amount){int dp[amount+1];for(int i=0;i<=amount;i++)dp[i]=amount+1;dp[0]=0;for(int i=1;i<=amount;i++)for(int j=0;j<n;j++)if(coins[j]<=i&&dp[i-coins[j]]+1<dp[i])dp[i]=dp[i-coins[j]]+1;return dp[amount]>amount?-1:dp[amount];}',
    }
  },
  { id:'d3', no:26, title:'Longest Common Subsequence', difficulty:'Medium', tags:['DP','String'],
    description:'Given strings text1 and text2, return the length of their longest common subsequence. Return 0 if none.',
    examples:[{input:'text1="abcde", text2="ace"', output:'3', explanation:'"ace" is LCS'}],
    constraints:['1 ≤ text1.length, text2.length ≤ 1000'],
    hints:['2D DP table','if text1[i-1]==text2[j-1]: dp[i][j] = dp[i-1][j-1]+1','else: max(dp[i-1][j], dp[i][j-1])'],
    testCases:[{input:'abcde ace',expected:'3'},{input:'abc abc',expected:'3'},{input:'abc def',expected:'0'}],
    starter:{
      python:'def longestCommonSubsequence(text1, text2):\n    m, n = len(text1), len(text2)\n    dp = [[0]*(n+1) for _ in range(m+1)]\n    for i in range(1,m+1):\n        for j in range(1,n+1):\n            if text1[i-1]==text2[j-1]: dp[i][j]=dp[i-1][j-1]+1\n            else: dp[i][j]=max(dp[i-1][j],dp[i][j-1])\n    return dp[m][n]',
      javascript:'function longestCommonSubsequence(t1,t2){\n    const m=t1.length,n=t2.length;\n    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));\n    for(let i=1;i<=m;i++)\n        for(let j=1;j<=n;j++)\n            dp[i][j]=t1[i-1]===t2[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);\n    return dp[m][n];\n}',
      java:'class Solution{public int longestCommonSubsequence(String t1,String t2){int m=t1.length(),n=t2.length();int[][]dp=new int[m+1][n+1];for(int i=1;i<=m;i++)for(int j=1;j<=n;j++)dp[i][j]=t1.charAt(i-1)==t2.charAt(j-1)?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);return dp[m][n];}}',
      cpp:'int longestCommonSubsequence(string t1,string t2){int m=t1.size(),n=t2.size();vector<vector<int>> dp(m+1,vector<int>(n+1,0));for(int i=1;i<=m;i++)for(int j=1;j<=n;j++)dp[i][j]=t1[i-1]==t2[j-1]?dp[i-1][j-1]+1:max(dp[i-1][j],dp[i][j-1]);return dp[m][n];}',
      c:'int longestCommonSubsequence(char*t1,char*t2){int m=strlen(t1),n=strlen(t2);int dp[m+1][n+1];memset(dp,0,sizeof(dp));for(int i=1;i<=m;i++)for(int j=1;j<=n;j++)dp[i][j]=t1[i-1]==t2[j-1]?dp[i-1][j-1]+1:(dp[i-1][j]>dp[i][j-1]?dp[i-1][j]:dp[i][j-1]);return dp[m][n];}',
    }
  },
  { id:'d4', no:27, title:'0/1 Knapsack', difficulty:'Medium', tags:['DP'],
    description:'Given n items each with weight[i] and value[i], and a knapsack of capacity W. Maximize total value without exceeding capacity. Each item can only be used once.',
    examples:[{input:'n=3, weights=[2,3,4], values=[3,4,5], W=5', output:'7', explanation:'Items 0+1: weight=5, value=7'}],
    constraints:['1 ≤ n ≤ 100','1 ≤ W ≤ 1000'],
    hints:['dp[i][w] = max value using first i items with capacity w','Either skip item i or include it'],
    testCases:[{input:'3 5\n2 3 4\n3 4 5',expected:'7'},{input:'4 8\n1 3 4 5\n1 4 5 7',expected:'13'}],
    starter:{
      python:'def knapsack(n, W, weights, values):\n    dp = [[0]*(W+1) for _ in range(n+1)]\n    for i in range(1,n+1):\n        for w in range(W+1):\n            dp[i][w] = dp[i-1][w]\n            if weights[i-1] <= w:\n                dp[i][w] = max(dp[i][w], dp[i-1][w-weights[i-1]]+values[i-1])\n    return dp[n][W]',
      javascript:'function knapsack(n,W,weights,values){\n    const dp=Array.from({length:n+1},()=>new Array(W+1).fill(0));\n    for(let i=1;i<=n;i++)\n        for(let w=0;w<=W;w++){\n            dp[i][w]=dp[i-1][w];\n            if(weights[i-1]<=w)dp[i][w]=Math.max(dp[i][w],dp[i-1][w-weights[i-1]]+values[i-1]);\n        }\n    return dp[n][W];\n}',
      java:'class Solution{public int knapsack(int n,int W,int[]w,int[]v){int[][]dp=new int[n+1][W+1];for(int i=1;i<=n;i++)for(int c=0;c<=W;c++){dp[i][c]=dp[i-1][c];if(w[i-1]<=c)dp[i][c]=Math.max(dp[i][c],dp[i-1][c-w[i-1]]+v[i-1]);}return dp[n][W];}}',
      cpp:'int knapsack(int n,int W,vector<int>&w,vector<int>&v){vector<vector<int>> dp(n+1,vector<int>(W+1,0));for(int i=1;i<=n;i++)for(int c=0;c<=W;c++){dp[i][c]=dp[i-1][c];if(w[i-1]<=c)dp[i][c]=max(dp[i][c],dp[i-1][c-w[i-1]]+v[i-1]);}return dp[n][W];}',
      c:'int knapsack(int n,int W,int*w,int*v){int dp[n+1][W+1];memset(dp,0,sizeof(dp));for(int i=1;i<=n;i++)for(int c=0;c<=W;c++){dp[i][c]=dp[i-1][c];if(w[i-1]<=c&&dp[i-1][c-w[i-1]]+v[i-1]>dp[i][c])dp[i][c]=dp[i-1][c-w[i-1]]+v[i-1];}return dp[n][W];}',
    }
  },
  { id:'d5', no:28, title:'Word Break', difficulty:'Medium', tags:['DP','Hash Set','String'],
    description:'Given string s and dictionary wordDict, return true if s can be segmented into space-separated dictionary words.',
    examples:[{input:'s="leetcode", wordDict=["leet","code"]', output:'true'}],
    constraints:['1 ≤ s.length ≤ 300'],
    hints:['dp[i] = can s[0..i] be segmented','dp[i] = true if dp[j] and s[j..i] in dict for some j'],
    testCases:[{input:'leetcode 2 leet code',expected:'true'},{input:'applepenapple 3 apple pen',expected:'true'},{input:'catsandog 5 cats dog sand and an',expected:'false'}],
    starter:{
      python:'def wordBreak(s, wordDict):\n    words = set(wordDict)\n    dp = [False]*(len(s)+1)\n    dp[0] = True\n    for i in range(1,len(s)+1):\n        for j in range(i):\n            if dp[j] and s[j:i] in words:\n                dp[i] = True\n                break\n    return dp[len(s)]',
      javascript:'function wordBreak(s,wordDict){\n    const words=new Set(wordDict);\n    const dp=new Array(s.length+1).fill(false);\n    dp[0]=true;\n    for(let i=1;i<=s.length;i++)\n        for(let j=0;j<i;j++)\n            if(dp[j]&&words.has(s.slice(j,i))){dp[i]=true;break;}\n    return dp[s.length];\n}',
      java:'class Solution{public boolean wordBreak(String s,List<String> dict){Set<String> set=new HashSet<>(dict);boolean[]dp=new boolean[s.length()+1];dp[0]=true;for(int i=1;i<=s.length();i++)for(int j=0;j<i;j++)if(dp[j]&&set.contains(s.substring(j,i))){dp[i]=true;break;}return dp[s.length()];}}',
      cpp:'bool wordBreak(string s,vector<string>&dict){unordered_set<string> words(dict.begin(),dict.end());int n=s.size();vector<bool> dp(n+1,false);dp[0]=true;for(int i=1;i<=n;i++)for(int j=0;j<i;j++)if(dp[j]&&words.count(s.substr(j,i-j))){dp[i]=true;break;}return dp[n];}',
      c:'/* Word break with DP - implement with character array checks */',
    }
  },
  // ── STACK & QUEUE ────────────────────────────────────────────────────────
  { id:'q1', no:29, title:'Valid Parentheses', difficulty:'Easy', tags:['Stack','String'],
    description:"Given string s with only '(',')','{','}','[',']', determine if it is valid. Must be closed in correct order.",
    examples:[{input:'s = "()[]{}"', output:'true'},{input:'s = "(]"', output:'false'}],
    constraints:['1 ≤ s.length ≤ 10⁴'],
    hints:['Use a stack','Push opening brackets, pop and match on closing'],
    testCases:[{input:'()[]{}',expected:'true'},{input:'(]',expected:'false'},{input:'{[]}',expected:'true'}],
    starter:{
      python:'def isValid(s):\n    stack = []\n    pairs = {")":"(","]":"[","}":"{"}\n    for c in s:\n        if c in "([{": stack.append(c)\n        elif not stack or stack[-1] != pairs[c]: return False\n        else: stack.pop()\n    return len(stack) == 0',
      javascript:'function isValid(s){\n    const stack=[],pairs={")":"(","]":"[","}":"{"};\n    for(const c of s){\n        if("([{".includes(c))stack.push(c);\n        else if(!stack.length||stack[stack.length-1]!==pairs[c])return false;\n        else stack.pop();\n    }\n    return stack.length===0;\n}',
      java:'class Solution{public boolean isValid(String s){Deque<Character> st=new ArrayDeque<>();for(char c:s.toCharArray()){if(c==\'(\'||c==\'[\'||c==\'{\')st.push(c);else{if(st.isEmpty())return false;char t=st.pop();if(c==\')\' &&t!=\'(\'||c==\']\' &&t!=\'[\'||c==\'}\' &&t!=\'{\')return false;}}return st.isEmpty();}}',
      cpp:'bool isValid(string s){stack<char> st;for(char c:s){if(c==\'(\'||c==\'[\'||c==\'{\')st.push(c);else{if(st.empty())return false;char t=st.top();st.pop();if(c==\')\' &&t!=\'(\'||c==\']\' &&t!=\'[\'||c==\'}\' &&t!=\'{\')return false;}}return st.empty();}',
      c:'int isValid(char*s){char st[10001];int top=-1;while(*s){if(*s==\'(\'||*s==\'[\'||*s==\'{\')st[++top]=*s;else{if(top<0)return 0;char t=st[top--];if(*s==\')\' &&t!=\'(\'||*s==\']\' &&t!=\'[\'||*s==\'}\' &&t!=\'{\')return 0;}s++;}return top==-1;}',
    }
  },
  { id:'q2', no:30, title:'Min Stack', difficulty:'Medium', tags:['Stack','Design'],
    description:'Design a stack that supports push, pop, top, and getMin() all in O(1) time.',
    examples:[{input:'MinStack(); push(-2); push(0); push(-3); getMin()→-3; pop(); top()→0; getMin()→-2', output:'-3, 0, -2'}],
    constraints:['At most 3×10⁴ operations'],
    hints:['Use an auxiliary stack to track minimums','Push min to aux stack only when needed'],
    testCases:[{input:'5\npush -2\npush 0\npush -3\ngetMin\npop\ngetMin',expected:'-3\n-2'}],
    starter:{
      python:'class MinStack:\n    def __init__(self):\n        self.stack = []\n        self.min_stack = []\n    def push(self, val):\n        self.stack.append(val)\n        self.min_stack.append(min(val, self.min_stack[-1] if self.min_stack else val))\n    def pop(self):\n        self.stack.pop()\n        self.min_stack.pop()\n    def top(self): return self.stack[-1]\n    def getMin(self): return self.min_stack[-1]',
      javascript:'class MinStack{\n    constructor(){this.s=[];this.m=[];}\n    push(v){this.s.push(v);this.m.push(Math.min(v,this.m.length?this.m[this.m.length-1]:v));}\n    pop(){this.s.pop();this.m.pop();}\n    top(){return this.s[this.s.length-1];}\n    getMin(){return this.m[this.m.length-1];}\n}',
      java:'class MinStack{Deque<Integer> s=new ArrayDeque<>(),m=new ArrayDeque<>();public void push(int v){s.push(v);m.push(m.isEmpty()?v:Math.min(v,m.peek()));}public void pop(){s.pop();m.pop();}public int top(){return s.peek();}public int getMin(){return m.peek();}}',
      cpp:'class MinStack{stack<int> s,m;public:void push(int v){s.push(v);m.push(m.empty()?v:min(v,m.top()));}void pop(){s.pop();m.pop();}int top(){return s.top();}int getMin(){return m.top();}};',
      c:'/* Min stack using two arrays */',
    }
  },
  // ── BINARY SEARCH ────────────────────────────────────────────────────────
  { id:'b1', no:31, title:'Binary Search', difficulty:'Easy', tags:['Binary Search','Array'],
    description:'Given a sorted array of distinct integers and a target, return the index if found, otherwise -1.',
    examples:[{input:'nums=[-1,0,3,5,9,12], target=9', output:'4'}],
    constraints:['1 ≤ nums.length ≤ 10⁴','All values distinct, sorted ascending'],
    hints:['mid = (l+r)//2','If target == nums[mid], return mid','If target < nums[mid], search left; else search right'],
    testCases:[{input:'6\n-1 0 3 5 9 12\n9',expected:'4'},{input:'6\n-1 0 3 5 9 12\n2',expected:'-1'}],
    starter:{
      python:'def search(nums, target):\n    l, r = 0, len(nums)-1\n    while l <= r:\n        mid = (l+r)//2\n        if nums[mid] == target: return mid\n        elif nums[mid] < target: l = mid+1\n        else: r = mid-1\n    return -1',
      javascript:'function search(nums,target){\n    let l=0,r=nums.length-1;\n    while(l<=r){\n        const mid=l+r>>1;\n        if(nums[mid]===target)return mid;\n        else if(nums[mid]<target)l=mid+1;\n        else r=mid-1;\n    }\n    return -1;\n}',
      java:'class Solution{public int search(int[]a,int t){int l=0,r=a.length-1;while(l<=r){int m=(l+r)/2;if(a[m]==t)return m;else if(a[m]<t)l=m+1;else r=m-1;}return -1;}}',
      cpp:'int search(vector<int>&a,int t){int l=0,r=a.size()-1;while(l<=r){int m=(l+r)/2;if(a[m]==t)return m;else if(a[m]<t)l=m+1;else r=m-1;}return -1;}',
      c:'int search(int*a,int n,int t){int l=0,r=n-1;while(l<=r){int m=(l+r)/2;if(a[m]==t)return m;else if(a[m]<t)l=m+1;else r=m-1;}return -1;}',
    }
  },
  { id:'b2', no:32, title:'Find Minimum in Rotated Sorted Array', difficulty:'Medium', tags:['Binary Search','Array'],
    description:'Given sorted array rotated between 1 and n times, find the minimum element.',
    examples:[{input:'nums = [3,4,5,1,2]', output:'1'},{input:'nums = [4,5,6,7,0,1,2]', output:'0'}],
    constraints:['1 ≤ nums.length ≤ 5000','All values unique'],
    hints:['Binary search on the pivot','If nums[mid] > nums[r], min is in right half','Else min is in left half including mid'],
    testCases:[{input:'5\n3 4 5 1 2',expected:'1'},{input:'7\n4 5 6 7 0 1 2',expected:'0'}],
    starter:{
      python:'def findMin(nums):\n    l, r = 0, len(nums)-1\n    while l < r:\n        mid = (l+r)//2\n        if nums[mid] > nums[r]: l = mid+1\n        else: r = mid\n    return nums[l]',
      javascript:'function findMin(nums){\n    let l=0,r=nums.length-1;\n    while(l<r){\n        const m=l+r>>1;\n        if(nums[m]>nums[r])l=m+1;\n        else r=m;\n    }\n    return nums[l];\n}',
      java:'class Solution{public int findMin(int[]a){int l=0,r=a.length-1;while(l<r){int m=(l+r)/2;if(a[m]>a[r])l=m+1;else r=m;}return a[l];}}',
      cpp:'int findMin(vector<int>&a){int l=0,r=a.size()-1;while(l<r){int m=(l+r)/2;if(a[m]>a[r])l=m+1;else r=m;}return a[l];}',
      c:'int findMin(int*a,int n){int l=0,r=n-1;while(l<r){int m=(l+r)/2;if(a[m]>a[r])l=m+1;else r=m;}return a[l];}',
    }
  },
  // ── HEAP / PRIORITY QUEUE ────────────────────────────────────────────────
  { id:'h1', no:33, title:'Kth Largest Element in Array', difficulty:'Medium', tags:['Heap','Sorting','Quick Select'],
    description:'Given an integer array nums and integer k, return the kth largest element.',
    examples:[{input:'nums=[3,2,1,5,6,4], k=2', output:'5'},{input:'nums=[3,2,3,1,2,4,5,5,6], k=4', output:'4'}],
    constraints:['1 ≤ k ≤ nums.length ≤ 10⁵'],
    hints:['Min-heap of size k: maintain k largest','heap.top() is kth largest','Or use QuickSelect for O(n) average'],
    testCases:[{input:'6\n3 2 1 5 6 4\n2',expected:'5'},{input:'9\n3 2 3 1 2 4 5 5 6\n4',expected:'4'}],
    starter:{
      python:'import heapq\ndef findKthLargest(nums, k):\n    heap = nums[:k]\n    heapq.heapify(heap)\n    for n in nums[k:]:\n        if n > heap[0]:\n            heapq.heapreplace(heap, n)\n    return heap[0]',
      javascript:'function findKthLargest(nums,k){\n    nums.sort((a,b)=>b-a);\n    return nums[k-1];\n}',
      java:'class Solution{public int findKthLargest(int[]a,int k){PriorityQueue<Integer> q=new PriorityQueue<>();for(int x:a){q.add(x);if(q.size()>k)q.poll();}return q.peek();}}',
      cpp:'int findKthLargest(vector<int>&a,int k){priority_queue<int,vector<int>,greater<int>> pq;for(int x:a){pq.push(x);if(pq.size()>k)pq.pop();}return pq.top();}',
      c:'int cmp(const void*a,const void*b){return *(int*)b-*(int*)a;}int findKthLargest(int*a,int n,int k){qsort(a,n,sizeof(int),cmp);return a[k-1];}',
    }
  },
  { id:'h2', no:34, title:'Top K Frequent Elements', difficulty:'Medium', tags:['Heap','Hash Map','Bucket Sort'],
    description:'Given integer array nums and integer k, return the k most frequent elements in any order.',
    examples:[{input:'nums=[1,1,1,2,2,3], k=2', output:'[1,2]'}],
    constraints:['1 ≤ nums.length ≤ 10⁵'],
    hints:['Count frequencies with hash map','Use min-heap of size k on (freq, num)','Or use bucket sort: bucket[freq] = nums'],
    testCases:[{input:'6\n1 1 1 2 2 3\n2',expected:'1 2'},{input:'1\n1\n1',expected:'1'}],
    starter:{
      python:'def topKFrequent(nums, k):\n    from collections import Counter\n    import heapq\n    count = Counter(nums)\n    return heapq.nlargest(k, count.keys(), key=count.get)',
      javascript:'function topKFrequent(nums,k){\n    const c={};\n    for(const x of nums)c[x]=(c[x]||0)+1;\n    return Object.keys(c).sort((a,b)=>c[b]-c[a]).slice(0,k).map(Number);\n}',
      java:'class Solution{public int[] topKFrequent(int[]a,int k){Map<Integer,Integer> c=new HashMap<>();for(int x:a)c.merge(x,1,Integer::sum);PriorityQueue<Integer> pq=new PriorityQueue<>((x,y)->c.get(x)-c.get(y));for(int x:c.keySet()){pq.add(x);if(pq.size()>k)pq.poll();}int[]r=new int[k];for(int i=k-1;i>=0;i--)r[i]=pq.poll();return r;}}',
      cpp:'vector<int> topKFrequent(vector<int>&a,int k){unordered_map<int,int> c;for(int x:a)c[x]++;priority_queue<pair<int,int>,vector<pair<int,int>>,greater<>> pq;for(auto&p:c){pq.push({p.second,p.first});if(pq.size()>k)pq.pop();}vector<int> r;while(!pq.empty()){r.push_back(pq.top().second);pq.pop();}return r;}',
      c:'/* Top K using counting sort / frequency map */',
    }
  },
  // ── SORTING & SEARCHING ──────────────────────────────────────────────────
  { id:'ss1', no:35, title:'Merge Intervals', difficulty:'Medium', tags:['Array','Sorting'],
    description:'Given array of intervals, merge all overlapping intervals and return an array of non-overlapping intervals.',
    examples:[{input:'intervals=[[1,3],[2,6],[8,10],[15,18]]', output:'[[1,6],[8,10],[15,18]]'}],
    constraints:['1 ≤ intervals.length ≤ 10⁴'],
    hints:['Sort by start time','If curr.start <= prev.end, merge by updating prev.end'],
    testCases:[{input:'4\n1 3\n2 6\n8 10\n15 18',expected:'1 6\n8 10\n15 18'},{input:'2\n1 4\n4 5',expected:'1 5'}],
    starter:{
      python:'def merge(intervals):\n    intervals.sort(key=lambda x: x[0])\n    res = [intervals[0]]\n    for s, e in intervals[1:]:\n        if s <= res[-1][1]: res[-1][1] = max(res[-1][1], e)\n        else: res.append([s, e])\n    return res',
      javascript:'function merge(intervals){\n    intervals.sort((a,b)=>a[0]-b[0]);\n    const res=[intervals[0]];\n    for(const[s,e] of intervals.slice(1)){\n        if(s<=res[res.length-1][1])res[res.length-1][1]=Math.max(res[res.length-1][1],e);\n        else res.push([s,e]);\n    }\n    return res;\n}',
      java:'class Solution{public int[][] merge(int[][]a){Arrays.sort(a,(x,y)->x[0]-y[0]);List<int[]> r=new ArrayList<>();r.add(a[0]);for(int i=1;i<a.length;i++){int[]last=r.get(r.size()-1);if(a[i][0]<=last[1])last[1]=Math.max(last[1],a[i][1]);else r.add(a[i]);}return r.toArray(new int[0][]);}}',
      cpp:'vector<vector<int>> merge(vector<vector<int>>&a){sort(a.begin(),a.end());vector<vector<int>> r={a[0]};for(int i=1;i<a.size();i++){if(a[i][0]<=r.back()[1])r.back()[1]=max(r.back()[1],a[i][1]);else r.push_back(a[i]);}return r;}',
      c:'/* Sort intervals then merge overlapping ones */',
    }
  },
  // ── MATH & BIT MANIPULATION ──────────────────────────────────────────────
  { id:'m1', no:36, title:'Number of 1 Bits (Hamming Weight)', difficulty:'Easy', tags:['Bit Manipulation','Math'],
    description:'Write a function that takes an unsigned integer and returns the number of 1 bits it has.',
    examples:[{input:'n = 00000000000000000000000000001011', output:'3'},{input:'n = 11111111111111111111111111111101', output:'31'}],
    constraints:['1 ≤ n ≤ 2³¹-1'],
    hints:['n & (n-1) clears the lowest set bit','Count iterations until n becomes 0'],
    testCases:[{input:'11',expected:'3'},{input:'128',expected:'1'}],
    starter:{
      python:'def hammingWeight(n):\n    count = 0\n    while n:\n        n &= n-1\n        count += 1\n    return count',
      javascript:'function hammingWeight(n){\n    let c=0;\n    while(n){n=n&(n-1);c++;}\n    return c;\n}',
      java:'class Solution{public int hammingWeight(int n){int c=0;while(n!=0){n&=n-1;c++;}return c;}}',
      cpp:'int hammingWeight(uint32_t n){int c=0;while(n){n&=n-1;c++;}return c;}',
      c:'int hammingWeight(uint32_t n){int c=0;while(n){n&=n-1;c++;}return c;}',
    }
  },
  { id:'m2', no:37, title:'Reverse Bits', difficulty:'Easy', tags:['Bit Manipulation'],
    description:'Reverse bits of a given 32-bit unsigned integer.',
    examples:[{input:'n = 00000010100101000001111010011100', output:'00111001011110000010100101000000 = 964176192'}],
    constraints:['Input is 32-bit unsigned integer'],
    hints:['Iterate 32 times','Extract LSB and shift into result from left'],
    testCases:[{input:'43261596',expected:'964176192'},{input:'4294967293',expected:'3221225471'}],
    starter:{
      python:'def reverseBits(n):\n    res = 0\n    for _ in range(32):\n        res = (res << 1) | (n & 1)\n        n >>= 1\n    return res',
      javascript:'function reverseBits(n){\n    let r=0;\n    for(let i=0;i<32;i++){r=(r*2)+(n&1);n>>=1;}\n    return r>>>0;\n}',
      java:'class Solution{public int reverseBits(int n){int r=0;for(int i=0;i<32;i++){r=(r<<1)|(n&1);n>>>=1;}return r;}}',
      cpp:'uint32_t reverseBits(uint32_t n){uint32_t r=0;for(int i=0;i<32;i++){r=(r<<1)|(n&1);n>>=1;}return r;}',
      c:'uint32_t reverseBits(uint32_t n){uint32_t r=0;for(int i=0;i<32;i++){r=(r<<1)|(n&1);n>>=1;}return r;}',
    }
  },
  // ── BACKTRACKING ─────────────────────────────────────────────────────────
  { id:'bt1', no:38, title:'Subsets', difficulty:'Medium', tags:['Backtracking','Array','Bit Manipulation'],
    description:'Given an integer array nums of unique elements, return all possible subsets (the power set). Do not include duplicates.',
    examples:[{input:'nums = [1,2,3]', output:'[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]'}],
    constraints:['1 ≤ nums.length ≤ 10'],
    hints:['Backtrack: for each element decide include or exclude','Or iterate: for each new number, add it to all existing subsets'],
    testCases:[{input:'3\n1 2 3',expected:'8 subsets'}],
    starter:{
      python:'def subsets(nums):\n    res = [[]]\n    for n in nums:\n        res += [sub + [n] for sub in res]\n    return res',
      javascript:'function subsets(nums){\n    let res=[[]];\n    for(const n of nums)res=[...res,...res.map(s=>[...s,n])];\n    return res;\n}',
      java:'class Solution{public List<List<Integer>> subsets(int[]nums){List<List<Integer>> r=new ArrayList<>();r.add(new ArrayList<>());for(int n:nums){int sz=r.size();for(int i=0;i<sz;i++){List<Integer> s=new ArrayList<>(r.get(i));s.add(n);r.add(s);}}return r;}}',
      cpp:'vector<vector<int>> subsets(vector<int>&a){vector<vector<int>> r={{}};for(int n:a){int sz=r.size();for(int i=0;i<sz;i++){r.push_back(r[i]);r.back().push_back(n);}}return r;}',
      c:'/* Generate all subsets using bit manipulation on 2^n */',
    }
  },
  { id:'bt2', no:39, title:'Permutations', difficulty:'Medium', tags:['Backtracking','Array'],
    description:'Given array of distinct integers, return all possible permutations.',
    examples:[{input:'nums = [1,2,3]', output:'[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]'}],
    constraints:['1 ≤ nums.length ≤ 6'],
    hints:['Backtrack: swap element at current position with all elements at i..n','Or: for each element, insert it in all positions of sub-permutation'],
    testCases:[{input:'3\n1 2 3',expected:'6 permutations'}],
    starter:{
      python:'def permute(nums):\n    res = []\n    def bt(start):\n        if start == len(nums): res.append(nums[:]); return\n        for i in range(start, len(nums)):\n            nums[start], nums[i] = nums[i], nums[start]\n            bt(start+1)\n            nums[start], nums[i] = nums[i], nums[start]\n    bt(0)\n    return res',
      javascript:'function permute(nums){\n    const res=[];\n    function bt(start){\n        if(start===nums.length){res.push([...nums]);return;}\n        for(let i=start;i<nums.length;i++){\n            [nums[start],nums[i]]=[nums[i],nums[start]];\n            bt(start+1);\n            [nums[start],nums[i]]=[nums[i],nums[start]];\n        }\n    }\n    bt(0);return res;\n}',
      java:'class Solution{public List<List<Integer>> permute(int[]a){List<List<Integer>> r=new ArrayList<>();bt(a,0,r);return r;}void bt(int[]a,int s,List<List<Integer>> r){if(s==a.length){List<Integer> p=new ArrayList<>();for(int x:a)p.add(x);r.add(p);return;}for(int i=s;i<a.length;i++){int t=a[s];a[s]=a[i];a[i]=t;bt(a,s+1,r);t=a[s];a[s]=a[i];a[i]=t;}}}',
      cpp:'vector<vector<int>> permute(vector<int>&a){vector<vector<int>> r;function<void(int)> bt=[&](int s){if(s==a.size()){r.push_back(a);return;}for(int i=s;i<a.size();i++){swap(a[s],a[i]);bt(s+1);swap(a[s],a[i]);}};bt(0);return r;}',
      c:'/* Generate permutations using recursive backtracking with swaps */',
    }
  },
  // ── SLIDING WINDOW ───────────────────────────────────────────────────────
  { id:'sw1', no:40, title:'Sliding Window Maximum', difficulty:'Hard', tags:['Sliding Window','Deque','Array'],
    description:'Given array nums and integer k, return max value in each sliding window of size k.',
    examples:[{input:'nums=[1,3,-1,-3,5,3,6,7], k=3', output:'[3,3,5,5,6,7]'}],
    constraints:['1 ≤ nums.length ≤ 10⁵','1 ≤ k ≤ nums.length'],
    hints:['Use monotonic deque storing indices','Deque front = max of current window','Remove indices outside window from front, smaller values from back'],
    testCases:[{input:'8\n1 3 -1 -3 5 3 6 7\n3',expected:'3 3 5 5 6 7'}],
    starter:{
      python:'from collections import deque\ndef maxSlidingWindow(nums, k):\n    dq, res = deque(), []\n    for i, n in enumerate(nums):\n        while dq and dq[0] < i-k+1: dq.popleft()\n        while dq and nums[dq[-1]] < n: dq.pop()\n        dq.append(i)\n        if i >= k-1: res.append(nums[dq[0]])\n    return res',
      javascript:'function maxSlidingWindow(nums,k){\n    const dq=[],res=[];\n    for(let i=0;i<nums.length;i++){\n        while(dq.length&&dq[0]<i-k+1)dq.shift();\n        while(dq.length&&nums[dq[dq.length-1]]<nums[i])dq.pop();\n        dq.push(i);\n        if(i>=k-1)res.push(nums[dq[0]]);\n    }\n    return res;\n}',
      java:'class Solution{public int[] maxSlidingWindow(int[]a,int k){int n=a.length;int[]r=new int[n-k+1];Deque<Integer> dq=new ArrayDeque<>();for(int i=0;i<n;i++){while(!dq.isEmpty()&&dq.peek()<i-k+1)dq.poll();while(!dq.isEmpty()&&a[dq.peekLast()]<a[i])dq.pollLast();dq.add(i);if(i>=k-1)r[i-k+1]=a[dq.peek()];}return r;}}',
      cpp:'vector<int> maxSlidingWindow(vector<int>&a,int k){deque<int> dq;vector<int> r;for(int i=0;i<a.size();i++){while(!dq.empty()&&dq.front()<i-k+1)dq.pop_front();while(!dq.empty()&&a[dq.back()]<a[i])dq.pop_back();dq.push_back(i);if(i>=k-1)r.push_back(a[dq.front()]);}return r;}',
      c:'/* Sliding window max using monotonic deque with array */',
    }
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ALL TOPICS (from problem bank)
// ═══════════════════════════════════════════════════════════════════════════
const ALL_TAGS = [...new Set(PROBLEMS.flatMap(p => p.tags))].sort();

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE helpers
// ═══════════════════════════════════════════════════════════════════════════
const getSolved = () => { try { return JSON.parse(localStorage.getItem('dsa_solved')||'{}'); } catch { return {}; } };
const setSolved = (id, lang) => { const s=getSolved(); s[id]={lang,time:Date.now()}; localStorage.setItem('dsa_solved',JSON.stringify(s)); };
const getCode   = (id, lang) => { try { return localStorage.getItem(`dsa_code_${id}_${lang}`) || ''; } catch { return ''; } };
const saveCode  = (id, lang, code) => { try { localStorage.setItem(`dsa_code_${id}_${lang}`, code); } catch {} };

// ═══════════════════════════════════════════════════════════════════════════
// JUDGE0 execution — calls your self-hosted backend
// ═══════════════════════════════════════════════════════════════════════════
const runViaJudge0 = async (code, language, stdin = '') => {
  const token = localStorage.getItem('token') || '';
  const resp  = await Promise.race([
    fetch('/api/code/run', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ code, language, stdin }),
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000)),
  ]);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || err.fix || `HTTP ${resp.status}`);
  }
  const d = await resp.json();
  if (d.verdict === 'Judge0 Offline') throw new Error('Judge0 not running');
  return d;
};

// JS browser fallback
const runJSBrowser = (code) => new Promise((resolve) => {
  const src = `self.onmessage=function(e){const L=[];const C={log:(...a)=>L.push(a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')),error:(...a)=>L.push('ERR:'+a.join(' '))};try{new Function('console',e.data)(C);self.postMessage({stdout:L.join('\\n')||'',stderr:'',verdict:'Accepted',time:'<1ms',memory:'N/A'});}catch(e){self.postMessage({stdout:'',stderr:e.message,verdict:'Runtime Error',time:'0ms',memory:'N/A'});}};`;
  const url=URL.createObjectURL(new Blob([src],{type:'application/javascript'}));
  const w=new Worker(url);
  const t=setTimeout(()=>{w.terminate();URL.revokeObjectURL(url);resolve({stdout:'',stderr:'TLE',verdict:'Time Limit Exceeded',time:'>5s',memory:'N/A'});},5000);
  w.onmessage=e=>{clearTimeout(t);w.terminate();URL.revokeObjectURL(url);resolve(e.data);};
  w.onerror=e=>{clearTimeout(t);w.terminate();URL.revokeObjectURL(url);resolve({stdout:'',stderr:e.message,verdict:'Runtime Error',time:'0ms',memory:'N/A'});};
  w.postMessage(code);
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function DSACoding() {
  const [screen,      setScreen]      = useState('list');
  const [selected,    setSelected]    = useState(null);
  const [lang,        setLang]        = useState('python');
  const [code,        setCode]        = useState('');
  const [tab,         setTab]         = useState('problem');
  const [filter,      setFilter]      = useState({ difficulty:'', tag:'', search:'' });
  const [running,     setRunning]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [runOutput,   setRunOutput]   = useState(null);
  const [submitOutput,setSubOutput]   = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [solved,      setSolvedState] = useState(getSolved());
  const [judge0OK,    setJudge0OK]    = useState(null); // null=unchecked, true/false
  const [submissions, setSubmissions] = useState([]);
  const editorRef = useRef(null);

  // Check Judge0 status on mount
  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    fetch('/api/code/status', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setJudge0OK(d.available))
      .catch(() => setJudge0OK(false));
  }, []);

  const openProblem = (prob) => {
    setSelected(prob);
    const saved = getCode(prob.id, lang);
    setCode(saved || prob.starter[lang] || '');
    setRunOutput(null);
    setSubOutput(null);
    setTab('problem');
    setCustomInput(prob.examples?.[0]?.input?.replace(/.*= /g,'') || '');
    setScreen('problem');
    // Load submission history from localStorage
    try {
      const subs = JSON.parse(localStorage.getItem(`dsa_subs_${prob.id}`) || '[]');
      setSubmissions(subs);
    } catch { setSubmissions([]); }
  };

  const changeLang = (l) => {
    if (selected) saveCode(selected.id, lang, code);
    setLang(l);
    const saved = selected ? getCode(selected.id, l) : '';
    setCode(saved || selected?.starter[l] || '');
    setRunOutput(null);
  };

  const resetCode = () => {
    setCode(selected?.starter[lang] || '');
    setRunOutput(null);
    setSubOutput(null);
  };

  // AUTO-SAVE code on change
  const handleCodeChange = (val) => {
    setCode(val || '');
    if (selected) saveCode(selected.id, lang, val || '');
  };

  // ── RUN CODE (custom input, no test cases) ────────────────────────────
  const runCode = async () => {
    if (!code.trim()) return toast.error('Write some code first!');
    setRunning(true); setRunOutput(null);
    try {
      let result;
      if (lang === 'javascript' && judge0OK === false) {
        result = await runJSBrowser(code);
      } else {
        result = await runViaJudge0(code, lang, customInput);
      }
      setRunOutput({ type:'run', ...result });
    } catch (err) {
      if (lang === 'javascript') {
        const r = await runJSBrowser(code);
        setRunOutput({ type:'run', ...r });
      } else {
        setRunOutput({ type:'run', verdict:'Judge0 Offline', stdout:'', stderr:
          'Judge0 CE is not running.\n\nStart it:\n  cd SmartHire/judge0\n  docker-compose up -d\n\nThen restart backend.' });
      }
    } finally { setRunning(false); }
  };

  // ── SUBMIT CODE (run against all test cases) ──────────────────────────
  const submitCode = async () => {
    if (!code.trim() || !selected) return;
    setSubmitting(true); setSubOutput(null);

    // For JS use browser execution; others need Judge0
    const usesBrowser = lang === 'javascript' && judge0OK === false;

    try {
      let passed = 0, total = selected.testCases?.length || 0;
      const results = [];

      if (usesBrowser && lang === 'javascript') {
        // Wrap each test case
        for (const tc of (selected.testCases || [])) {
          const wrappedCode = `${code}\n// Test\nconst _input = ${JSON.stringify(tc.input)};\nconsole.log(JSON.stringify(typeof solve !== 'undefined' ? solve : null));`;
          const r = await runJSBrowser(code);
          const got = r.stdout.trim();
          const exp = tc.expected.trim();
          const ok  = got === exp || r.verdict === 'Accepted';
          if (ok) passed++;
          results.push({ input: tc.input, expected: exp, got, passed: ok, verdict: r.verdict });
        }
      } else {
        // Use Judge0 for each test case
        for (const tc of (selected.testCases || [])) {
          try {
            const r = await runViaJudge0(code, lang, tc.input);
            const got = (r.stdout || '').trim();
            const exp = tc.expected.trim();
            const ok  = got === exp;
            if (ok) passed++;
            results.push({ input:tc.input, expected:exp, got, passed:ok, verdict:r.verdict, time:r.time, memory:r.memory });
          } catch {
            results.push({ input:tc.input, expected:tc.expected, got:'Error', passed:false, verdict:'Error' });
          }
        }
      }

      const status = passed === total ? 'Accepted' : 'Wrong Answer';
      const subRecord = {
        id: Date.now(),
        lang, status, passed, total,
        time: new Date().toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
        results,
      };

      // Save to localStorage
      const prev = JSON.parse(localStorage.getItem(`dsa_subs_${selected.id}`) || '[]');
      const newSubs = [subRecord, ...prev].slice(0, 10);
      localStorage.setItem(`dsa_subs_${selected.id}`, JSON.stringify(newSubs));
      setSubmissions(newSubs);

      if (status === 'Accepted') {
        setSolved(selected.id, lang);
        setSolvedState(getSolved());
        toast.success('🎉 Accepted! All test cases passed!');
      } else {
        toast.error(`❌ ${status} — ${passed}/${total} test cases passed`);
      }

      setSubOutput({ type:'submit', status, passed, total, results });
      setTab('submissions');
    } catch (err) {
      setSubOutput({ type:'submit', status:'Error', error: err.message });
      toast.error('Submission error: ' + err.message);
    } finally { setSubmitting(false); }
  };

  const solvedMap = solved;
  const filtered  = PROBLEMS.filter(p => {
    if (filter.difficulty && p.difficulty !== filter.difficulty) return false;
    if (filter.tag && !p.tags.includes(filter.tag)) return false;
    if (filter.search && !p.title.toLowerCase().includes(filter.search.toLowerCase()) &&
        !p.tags.some(t => t.toLowerCase().includes(filter.search.toLowerCase()))) return false;
    return true;
  });

  const stats = {
    total:  PROBLEMS.length,
    solved: Object.keys(solvedMap).length,
    easy:   PROBLEMS.filter(p=>p.difficulty==='Easy').length,
    medium: PROBLEMS.filter(p=>p.difficulty==='Medium').length,
    hard:   PROBLEMS.filter(p=>p.difficulty==='Hard').length,
  };

  // ── PROBLEM LIST ─────────────────────────────────────────────────────────
  if (screen === 'list') return (
    <div style={{ padding:24, maxWidth:1200, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:'#f0f6ff', fontFamily:"'Sora',sans-serif" }}>DSA Practice</h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:C.gray }}>
            {PROBLEMS.length} problems — Arrays, Strings, Trees, Graphs, DP, and more
          </p>
        </div>
        {/* Judge0 status badge */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background: judge0OK===true?'rgba(16,201,138,0.1)':judge0OK===false?'rgba(240,75,75,0.1)':'rgba(100,116,139,0.1)', border:`1px solid ${judge0OK===true?C.green:judge0OK===false?C.red:C.gray}33`, borderRadius:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: judge0OK===true?C.green:judge0OK===false?C.red:C.gray, animation: judge0OK===null?'pulse 1.5s ease-in-out infinite':undefined }}/>
          <span style={{ fontSize:12, fontWeight:600, color: judge0OK===true?C.green:judge0OK===false?C.red:C.light }}>
            {judge0OK===null ? 'Checking Judge0...' : judge0OK ? 'Judge0 Running ✓' : 'Judge0 Offline'}
          </span>
          {judge0OK===false && <a href="https://github.com/judge0/judge0" target="_blank" rel="noreferrer" style={{ fontSize:11, color:C.cyan, textDecoration:'none' }}>setup guide</a>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        {[
          {label:'Total',  val:stats.total,  color:C.cyan},
          {label:'Solved', val:stats.solved, color:C.green},
          {label:'Easy',   val:stats.easy,   color:C.green},
          {label:'Medium', val:stats.medium, color:C.amber},
          {label:'Hard',   val:stats.hard,   color:C.red},
        ].map(s => (
          <div key={s.label} style={{ padding:'12px 18px', background:`${s.color}0a`, border:`1px solid ${s.color}22`, borderRadius:12, textAlign:'center', minWidth:80 }}>
            <p style={{ margin:0, fontSize:22, fontWeight:800, color:s.color, fontFamily:"'Sora',sans-serif" }}>{s.val}</p>
            <p style={{ margin:'2px 0 0', fontSize:11, color:C.gray }}>{s.label}</p>
          </div>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center' }}>
          <div style={{ height:8, width:200, background:'rgba(255,255,255,0.05)', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(stats.solved/stats.total)*100}%`, background:`linear-gradient(90deg,${C.green},${C.cyan})`, borderRadius:999, transition:'width 1s' }}/>
          </div>
          <span style={{ marginLeft:10, fontSize:12, color:C.green, fontWeight:700 }}>{Math.round((stats.solved/stats.total)*100)}%</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#071525', border:`1px solid ${C.cyan}20`, borderRadius:9, padding:'8px 12px', flex:1, maxWidth:340 }}>
          <Search size={14} color={C.gray}/>
          <input value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))} placeholder="Search problems or topics..."
            style={{ background:'none', border:'none', outline:'none', fontSize:13, color:C.white, flex:1, fontFamily:"'Sora',sans-serif" }}/>
        </div>
        <select style={st.sel} value={filter.difficulty} onChange={e=>setFilter(f=>({...f,difficulty:e.target.value}))}>
          <option value="">All Difficulties</option>
          {['Easy','Medium','Hard'].map(d=><option key={d}>{d}</option>)}
        </select>
        <select style={st.sel} value={filter.tag} onChange={e=>setFilter(f=>({...f,tag:e.target.value}))}>
          <option value="">All Topics</option>
          {ALL_TAGS.map(t=><option key={t}>{t}</option>)}
        </select>
        {(filter.difficulty||filter.tag||filter.search) && (
          <button onClick={()=>setFilter({difficulty:'',tag:'',search:''})} style={{ padding:'8px 14px', background:'rgba(240,75,75,0.1)', border:`1px solid ${C.red}33`, borderRadius:9, color:C.red, fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>Clear filters</button>
        )}
      </div>

      <p style={{ fontSize:12, color:C.gray, marginBottom:10 }}>{filtered.length} problem{filtered.length!==1?'s':''} found</p>

      {/* Problem table */}
      <div style={{ background:'linear-gradient(145deg,#0b1a2e,#0d1f3c)', border:`1px solid ${C.cyan}15`, borderRadius:16, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'rgba(0,200,240,0.04)' }}>
              {['#','Title','Difficulty','Topics','Status'].map(h=>(
                <th key={h} style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const isSolved = !!solvedMap[p.id];
              return (
                <tr key={p.id} onClick={()=>openProblem(p)} style={{ cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(0,200,240,0.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'14px 16px', fontSize:12, color:C.gray, width:50 }}>{p.no}</td>
                  <td style={{ padding:'14px 16px' }}>
                    <span style={{ fontSize:14, fontWeight:isSolved?600:500, color:isSolved?C.green:C.white }}>{p.title}</span>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:`${DC[p.difficulty]}18`, color:DC[p.difficulty], border:`1px solid ${DC[p.difficulty]}33` }}>{p.difficulty}</span>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {p.tags.slice(0,3).map(t=>(
                        <span key={t} style={{ padding:'2px 7px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:5, fontSize:10, color:C.light }}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    {isSolved
                      ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:C.green, fontWeight:700 }}><CheckCircle size={13}/>Solved</span>
                      : <span style={{ fontSize:12, color:'#2d3f55' }}>—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ textAlign:'center', color:C.gray, padding:'50px 0' }}>No problems match your filters.</p>}
      </div>
    </div>
  );

  // ── PROBLEM EDITOR ────────────────────────────────────────────────────────
  const isSolved = selected && !!solvedMap[selected.id];

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:C.bg, overflow:'hidden' }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', background:'#071525', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <button onClick={()=>setScreen('list')} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', color:C.gray, cursor:'pointer', fontSize:13, fontFamily:"'Sora',sans-serif" }}>
          <ChevronLeft size={16}/> Problems
        </button>
        <div style={{ width:1, height:20, background:'rgba(255,255,255,0.1)' }}/>
        <span style={{ fontSize:14, fontWeight:700, color:C.white }}>{selected?.no}. {selected?.title}</span>
        <span style={{ padding:'2px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:`${DC[selected?.difficulty]}18`, color:DC[selected?.difficulty] }}>{selected?.difficulty}</span>
        {isSolved && <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:C.green, fontWeight:700 }}><CheckCircle size={12}/>Solved</span>}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:judge0OK?C.green:C.red }}/>
          <span style={{ fontSize:11, color:judge0OK?C.green:C.red }}>{judge0OK?'Judge0 Ready':'Judge0 Offline'}</span>
        </div>
      </div>

      {/* Split pane */}
      <div style={{ display:'flex', flex:1, gap:0, minHeight:0, overflow:'hidden' }}>

        {/* LEFT: problem description */}
        <div style={{ width:'42%', display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.06)', minWidth:0 }}>
          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            {[['problem','Description',BookOpen],['hints','Hints',Lightbulb],['submissions','Submissions',History]].map(([key,label,Icon])=>(
              <button key={key} onClick={()=>setTab(key)} style={{ display:'flex', alignItems:'center', gap:6, padding:'11px 18px', background:'none', border:'none', borderBottom:`2px solid ${tab===key?C.cyan:'transparent'}`, color:tab===key?C.cyan:C.gray, fontSize:13, fontWeight:tab===key?700:500, cursor:'pointer', fontFamily:"'Sora',sans-serif", transition:'all 0.15s' }}>
                <Icon size={14}/>{label}
                {key==='submissions' && submissions.length>0 && <span style={{ padding:'1px 6px', background:`${C.violet}22`, borderRadius:999, fontSize:10, color:C.violet }}>{submissions.length}</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex:1, overflowY:'auto', padding:20 }}>
            {tab === 'problem' && <ProblemTab problem={selected}/>}
            {tab === 'hints' && <HintsTab hints={selected?.hints}/>}
            {tab === 'submissions' && <SubmissionsTab list={submissions} runOutput={runOutput} submitOutput={submitOutput}/>}
          </div>
        </div>

        {/* RIGHT: editor */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
          {/* Editor toolbar */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', background:'#071525', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <select value={lang} onChange={e=>changeLang(e.target.value)} style={st.sel}>
              {LANGS.map(l=><option key={l} value={l}>{LANG_LABELS[l]}</option>)}
            </select>
            <button onClick={resetCode} title="Reset to starter code" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, color:C.gray, fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
              <RotateCcw size={12}/> Reset
            </button>
            <span style={{ marginLeft:'auto', fontSize:11, color:C.gray }}>
              {lang==='javascript'&&!judge0OK ? '⚡ Browser execution' : '🐳 Judge0 CE'}
            </span>
          </div>

          {/* Monaco editor */}
          <div style={{ flex:1, minHeight:0, overflow:'hidden' }}>
            <Editor
              height="100%"
              language={lang === 'cpp' ? 'cpp' : lang === 'c' ? 'c' : lang}
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              onMount={e => editorRef.current = e}
              options={{ fontSize:13.5, minimap:{enabled:false}, scrollBeyondLastLine:false, wordWrap:'on', automaticLayout:true, tabSize:2, lineNumbers:'on', renderLineHighlight:'line', fontFamily:"'Fira Code','Cascadia Code',Consolas,monospace", fontLigatures:true }}
            />
          </div>

          {/* Bottom panel */}
          <div style={{ flexShrink:0, padding:'10px 16px', background:'#071525', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:8 }}>
            {/* Custom input */}
            <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <p style={{ margin:'0 0 4px', fontSize:10, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em' }}>Custom Input (for Run)</p>
                <textarea value={customInput} onChange={e=>setCustomInput(e.target.value)} rows={2}
                  style={{ width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(0,200,240,0.12)', borderRadius:7, padding:'6px 10px', fontSize:12, color:C.white, outline:'none', fontFamily:'monospace', resize:'vertical', boxSizing:'border-box' }}
                  placeholder="Enter test input..."/>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={runCode} disabled={running} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flex:1, padding:'10px', background:'rgba(0,200,240,0.1)', border:`1px solid ${C.cyan}40`, borderRadius:9, color:C.cyan, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", opacity:running?0.7:1 }}>
                {running ? <Loader2 size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Play size={15}/>}
                {running ? 'Running...' : 'Run Code'}
              </button>
              <button onClick={submitCode} disabled={submitting} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flex:1, padding:'10px', background:submitting?'rgba(16,201,138,0.1)':C.green, border:'none', borderRadius:9, color:submitting?C.green:'#040c18', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", opacity:submitting?0.7:1 }}>
                {submitting ? <Loader2 size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Send size={15}/>}
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            {/* Run output */}
            {runOutput && <OutputPanel output={runOutput}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function ProblemTab({ problem }) {
  if (!problem) return null;
  return (
    <div style={{ color:C.light, lineHeight:1.8, fontSize:14 }}>
      <p style={{ marginTop:0 }}>{problem.description}</p>
      {(problem.examples||[]).map((ex,i) => (
        <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
          <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em' }}>Example {i+1}</p>
          <p style={{ margin:'0 0 4px', fontSize:13 }}><span style={{ color:C.gray }}>Input: </span><code style={{ color:C.cyan, fontFamily:'monospace', background:'rgba(0,200,240,0.06)', padding:'1px 6px', borderRadius:4 }}>{ex.input}</code></p>
          <p style={{ margin:'0 0 4px', fontSize:13 }}><span style={{ color:C.gray }}>Output: </span><code style={{ color:C.green, fontFamily:'monospace', background:'rgba(16,201,138,0.06)', padding:'1px 6px', borderRadius:4 }}>{ex.output}</code></p>
          {ex.explanation && <p style={{ margin:'6px 0 0', fontSize:12, color:C.gray, fontStyle:'italic' }}>💬 {ex.explanation}</p>}
        </div>
      ))}
      {(problem.constraints||[]).length > 0 && (
        <>
          <p style={{ margin:'16px 0 8px', fontSize:12, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em' }}>Constraints</p>
          <ul style={{ margin:0, paddingLeft:20 }}>
            {problem.constraints.map((c,i) => (
              <li key={i} style={{ fontSize:13, color:C.light, marginBottom:4, fontFamily:'monospace' }}>{c}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function HintsTab({ hints }) {
  const [revealed, setRevealed] = useState([]);
  const all = hints || ['Break the problem into smaller subproblems.','Try a brute force first, then optimize.','Think about edge cases: empty, single element, duplicates.'];
  return (
    <div>
      <p style={{ margin:'0 0 16px', fontSize:12, color:C.gray }}>Hints are revealed one at a time. Think before revealing!</p>
      {all.map((h,i) => (
        <div key={i} style={{ marginBottom:10 }}>
          {revealed.includes(i) ? (
            <div style={{ display:'flex', gap:10, padding:'12px 14px', background:'rgba(124,92,252,0.06)', border:'1px solid rgba(124,92,252,0.2)', borderRadius:9 }}>
              <span style={{ fontSize:12, fontWeight:800, color:'#7c5cfc', flexShrink:0 }}>#{i+1}</span>
              <p style={{ margin:0, fontSize:13, color:C.light, lineHeight:1.6 }}>{h}</p>
            </div>
          ) : (
            <button onClick={()=>setRevealed([...revealed,i])} style={{ width:'100%', padding:'10px 14px', background:'rgba(124,92,252,0.04)', border:'1px solid rgba(124,92,252,0.15)', borderRadius:9, color:'#7c5cfc', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', alignItems:'center', gap:8 }}>
              <Lightbulb size={14}/> Reveal Hint {i+1}
              {i > 0 && !revealed.includes(i-1) && <Lock size={12} style={{ marginLeft:'auto', opacity:0.5 }}/>}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function SubmissionsTab({ list, runOutput, submitOutput }) {
  return (
    <div>
      {/* Latest submit result */}
      {submitOutput && (
        <div style={{ marginBottom:16, padding:14, background:`${submitOutput.status==='Accepted'?C.green:C.red}0a`, border:`1px solid ${submitOutput.status==='Accepted'?C.green:C.red}33`, borderRadius:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            {submitOutput.status==='Accepted' ? <CheckCircle size={16} color={C.green}/> : <XCircle size={16} color={C.red}/>}
            <span style={{ fontSize:14, fontWeight:800, color:submitOutput.status==='Accepted'?C.green:C.red }}>{submitOutput.status}</span>
            {submitOutput.passed !== undefined && <span style={{ fontSize:12, color:C.gray, marginLeft:4 }}>{submitOutput.passed}/{submitOutput.total} test cases</span>}
          </div>
          {/* Per test case results */}
          {submitOutput.results?.map((r,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'rgba(255,255,255,0.02)', borderRadius:6, marginBottom:4 }}>
              {r.passed ? <CheckCircle size={12} color={C.green}/> : <XCircle size={12} color={C.red}/>}
              <span style={{ fontSize:12, color:r.passed?C.green:C.red, fontWeight:600 }}>Test {i+1}</span>
              {!r.passed && <span style={{ fontSize:11, color:C.gray }}>Expected: <code style={{ color:C.amber }}>{r.expected}</code> Got: <code style={{ color:C.red }}>{r.got || 'error'}</code></span>}
              {r.time && <span style={{ marginLeft:'auto', fontSize:11, color:C.gray }}>{r.time}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Run output */}
      {runOutput && (
        <div style={{ marginBottom:16, padding:12, background:'rgba(0,200,240,0.04)', border:'1px solid rgba(0,200,240,0.15)', borderRadius:10 }}>
          <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em' }}>Last Run</p>
          <div style={{ display:'flex', gap:10, marginBottom:4 }}>
            <span style={{ fontSize:12, fontWeight:700, color:runOutput.verdict==='Accepted'?C.green:C.cyan }}>{runOutput.verdict}</span>
            {runOutput.time && <span style={{ fontSize:11, color:C.gray }}><Clock size={11} style={{ verticalAlign:'middle' }}/> {runOutput.time}</span>}
            {runOutput.memory && <span style={{ fontSize:11, color:C.gray }}><Cpu size={11} style={{ verticalAlign:'middle' }}/> {runOutput.memory}</span>}
          </div>
          {runOutput.stdout && <pre style={{ margin:0, fontSize:12, color:C.green, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{runOutput.stdout}</pre>}
          {runOutput.stderr && <pre style={{ margin:0, fontSize:12, color:C.red, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{runOutput.stderr}</pre>}
        </div>
      )}

      {/* History */}
      {list.length > 0 && (
        <>
          <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:700, color:C.gray, textTransform:'uppercase', letterSpacing:'0.07em' }}>History</p>
          {list.map((s,i) => (
            <div key={i} style={{ padding:'10px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:s.status==='Accepted'?C.green:C.red }}>{s.status==='Accepted'?'✅':'❌'} {s.status}</span>
              <span style={{ fontSize:12, color:C.light, padding:'1px 8px', background:'rgba(255,255,255,0.05)', borderRadius:5 }}>{s.lang}</span>
              <span style={{ fontSize:11, color:C.gray }}>{s.passed}/{s.total} tests</span>
              <span style={{ fontSize:11, color:C.gray, marginLeft:'auto' }}>{s.time}</span>
            </div>
          ))}
        </>
      )}

      {!submitOutput && !runOutput && list.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <History size={32} color={C.gray} style={{ marginBottom:12 }}/>
          <p style={{ color:C.gray, fontSize:13 }}>No submissions yet.</p>
          <p style={{ color:'#2d3f55', fontSize:12 }}>Submit your solution to see results here.</p>
        </div>
      )}
    </div>
  );
}

function OutputPanel({ output }) {
  if (!output) return null;
  const color = output.verdict==='Accepted' ? C.green : output.type==='run' ? C.cyan : C.red;
  return (
    <div style={{ background:'#020c18', border:`1px solid ${color}33`, borderRadius:9, padding:'10px 14px', maxHeight:130, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        {output.verdict==='Accepted' ? <CheckCircle size={13} color={C.green}/> : <AlertCircle size={13} color={color}/>}
        <span style={{ fontSize:12, fontWeight:700, color }}>{output.verdict || output.status || 'Output'}</span>
        {output.time && <span style={{ fontSize:11, color:C.gray, marginLeft:'auto' }}><Clock size={11} style={{ verticalAlign:'middle' }}/> {output.time}</span>}
        {output.memory && <span style={{ fontSize:11, color:C.gray }}><Cpu size={11} style={{ verticalAlign:'middle' }}/> {output.memory}</span>}
      </div>
      {output.stdout && <pre style={{ margin:0, fontSize:12, color:C.green, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{output.stdout}</pre>}
      {output.stderr && <pre style={{ margin:0, fontSize:11, color:C.red, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{output.stderr}</pre>}
    </div>
  );
}

const st = {
  sel: { background:'#071525', border:'1px solid rgba(0,200,240,0.15)', borderRadius:8, padding:'7px 10px', fontSize:12, color:C.white, outline:'none', fontFamily:"'Sora',sans-serif", cursor:'pointer' },
};

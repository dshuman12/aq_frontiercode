from setuptools import setup, find_packages

setup(
    name="flowq",
    version="0.1.0",
    packages=find_packages(exclude=["tests*"]),
    install_requires=[
        "click==8.1.7",
    ],
    entry_points={
        "console_scripts": [
            "flowq=flowq.cli:cli",
        ],
    },
    python_requires=">=3.10",
)

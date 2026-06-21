from setuptools import setup, find_packages

setup(
    name="meridian",
    version="0.9.2",
    description="A Python library for graph construction, analysis, and network algorithms",
    author="meridian contributors",
    python_requires=">=3.9",
    packages=find_packages(exclude=["tests*"]),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Scientific/Engineering :: Mathematics",
        "Topic :: Software Development :: Libraries",
    ],
)
